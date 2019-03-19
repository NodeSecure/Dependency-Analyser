// Require Node.js Dependencies
const { writeFile, readFile } = require("fs").promises;
const { join } = require("path");

// Require Third-party Dependencies
require("make-promises-safe");
require("dotenv").config();
const repos = require("repos");
const { yellow, red, green } = require("kleur");
const { get } = require("httpie");
const polka = require("polka");
const send = require("@polka/send-type");

// CONSTANTS
const VIEW_DIR = join(__dirname, "views");
const LINK_FILE = join(__dirname, "data", "link.json");

// Globals
const token = process.env.GIT_TOKEN;
const projectLink = Object.create(null);
const orphans = new Set();

async function startHTTPServer(data = {}) {
    console.log(green("Starting HTTP Server on port: 1337"));
    const view = await readFile(join(VIEW_DIR, "index.html"), { encoding: "utf8" });

    polka()
        .get("/", (req, res) => send(res, 200, view, { "Content-Type": "text/html" }))
        .get("/data", (req, res) => send(res, 200, data))
        .listen(1337);
}

async function processPackage(repo, URL) {
    console.log(`- Processing ${yellow(repo.fullName)}`);
    try {
        const { data } = await get(URL, {
            headers: {
                "User-Agent": "SlimIO",
                Authorization: `token ${token}`,
                Accept: "application/vnd.github.v3.raw"
            }
        });

        const pkg = JSON.parse(data);
        const filteredDeps = Object.keys(pkg.dependencies || {}).filter((name) => name.startsWith("@slimio"));

        for (const dep of filteredDeps) {
            const [, name] = dep.split("/");
            const fName = name.toLowerCase();

            projectLink[repo.name].dependOn.push(fName);
            if (Reflect.has(projectLink, fName)) {
                projectLink[fName].uses.push(repo.name);
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

async function main() {
    const [arg = ""] = process.argv.slice(2);
    if (arg.startsWith("--skip")) {
        const data = await readFile(LINK_FILE);
        await startHTTPServer(JSON.parse(data));

        return void 0;
    }

    console.time("gen_link");
    const fullRepositories = await repos("SlimIO", { token });
    const filteredRepositories = fullRepositories
        .filter((row) => row.archived === false)
        .map((row) => {
            const name = row.name.toLowerCase();
            const license = row.license || {};

            projectLink[name] = Object.freeze({
                size: row.size || 0,
                license: license.name || "N/A",
                description: row.description || "",
                uses: [],
                dependOn: []
            });

            return {
                id: row.id,
                fullName: row.full_name,
                name,
                defaultBranch: row.default_branch
            };
        });

    const promises = [];
    for (const repo of filteredRepositories) {
        const packageURL = new URL(`https://api.github.com/repos/${repo.fullName}/contents/package.json`);
        promises.push(processPackage(repo, packageURL));
    }
    await Promise.all(promises);
    console.timeEnd("gen_link");

    console.log("\nOrphans:");
    console.log(orphans);

    // Write file on the disk!
    await writeFile(join(__dirname, "data", "link.json"), JSON.stringify(projectLink, null, 4));
    await startHTTPServer(projectLink);

    return void 0;
}
main().catch(console.error);
