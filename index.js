// Require Node.js Dependencies
const { writeFile } = require("fs").promises;
const { join } = require("path");

// Require Third-party Dependencies
require("make-promises-safe");
require("dotenv").config();
const repos = require("repos");
const { yellow, red, green } = require("kleur");
const { get } = require("httpie");

// CONSTANTS
const token = process.env.GIT_TOKEN;

function startHTTPServer() {
    console.log(green("start http server!"));
}

async function main() {
    const [arg = ""] = process.argv.slice(2);
    if (arg.startsWith("--skip")) {
        startHTTPServer();

        return void 0;
    }

    console.time("gen_link");
    const orphans = new Set();
    const projectLink = Object.create(null);

    const fullRepositories = await repos("SlimIO", { token });
    const filteredRepositories = fullRepositories
        .filter((row) => row.archived === false)
        .map((row) => {
            const name = row.name.toLowerCase();
            projectLink[name] = Object.freeze({
                uses: new Set(), dependOn: new Set()
            });

            return {
                id: row.id,
                fullName: row.full_name,
                name,
                url: row.html_url,
                desc: row.description,
                // size: row.size,
                // license: row.license,
                defaultBranch: row.default_branch
            };
        });

    // TODO: do this Asynchronously
    for (const repo of filteredRepositories) {
        console.log(`- Processing ${yellow(repo.fullName)}`);
        const packageURL = new URL(`https://api.github.com/repos/${repo.fullName}/contents/package.json`);

        try {
            const { data } = await get(packageURL, {
                headers: {
                    "User-Agent": "SlimIO",
                    Authorization: `token ${token}`,
                    Accept: "application/vnd.github.v3.raw"
                }
            });

            const pkg = JSON.parse(data);
            const slimioDep = Object.keys(pkg.dependencies || {}).filter((name) => name.startsWith("@slimio"));

            for (const dep of slimioDep) {
                const [, name] = dep.split("/");
                const fName = name.toLowerCase();

                projectLink[repo.name].uses.add(fName);
                if (Reflect.has(projectLink, fName)) {
                    projectLink[fName].dependOn.add(repo.name);
                }
                else {
                    orphans.add(fName);
                }
            }
        }
        catch (err) {
            console.log(red(`Failed to retrieve project: ${yellow(repo.fullName)}`));
        }
    }
    console.timeEnd("gen_link");

    // Write file on the disk!
    await writeFile(join(__dirname, "data", "link.json"), JSON.stringify(projectLink, null, 4));
    startHTTPServer();

    return void 0;
}
main().catch(console.error);
