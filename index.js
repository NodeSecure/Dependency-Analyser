import "make-promises-safe";
import dotenv from "dotenv";
dotenv.config();

// Require Node.js Dependencies
import fs from "fs";
const { createReadStream, readFileSync, promises: { writeFile, readFile } } = fs;
import { join } from "path";

// Require Third-party Dependencies
import { fetch } from "fetch-github-repositories";
import { yellow, red, white } from "kleur";
import { get } from "httpie";
import polka from "polka";
import send from "@polka/send-type";
import { manifest as _manifest } from "pacote";
import sirv from "sirv";
import open from "open";

// CONSTANTS
const VIEW_DIR = join(__dirname, "views");
const LINK_FILE = join(__dirname, "data", `${process.env.ORG_NAME}.json`);
const FILTER_ORG = process.env.FILTER_ORG || "ok";
const NPM_TOKEN = typeof process.env.NPM_TOKEN === "string" ? { token: process.env.NPM_TOKEN } : {};

// Globals
const token = process.env.GIT_TOKEN;
const projectLink = Object.create(null);
const orphans = [];
const repoPkgLinker = new Map();
const fullExtDeps = new Set();
const packageException = new Set((process.env.EXCEPT_PKG || "").split(","));
const npmOrg = process.env.NPM_NAME || `@${process.env.ORG_NAME.toLowerCase()}`;
let idCount = 0;

/**
 * @async
 * @function startHTTPServer
 * @param {!object} data
 * @returns {Promise<void>}
 */
async function startHTTPServer(data = {}) {
  const port = process.env.HTTP_PORT || 1337;
  const httpLink = `http://localhost:${port}`;

  const server = polka()
    .use(sirv(join(__dirname, "public"), { dev: true }))
    .get("/", (req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      createReadStream(join(VIEW_DIR, "index.html")).pipe(res);
    })
    .get("/data", (req, res) => send(res, 200, data))
    .get("/api/:pkg/:org?", async(req, res) => {
      const { pkg, org } = req.params;
      if (typeof pkg !== "string" || pkg.length === 0) {
        return send(res, 401, "Pkg must be a string");
      }

      const manifest = await _manifest(
        typeof org === "undefined" ? pkg : `${org}/${pkg}`,
        { ...NPM_TOKEN }
      );

      return send(res, 200, manifest);
    });

  server.listen(port, async() => {
    console.log(white().bold(`\n > HTTP Server started at ${yellow().bold(httpLink)}\n`));
    await open(httpLink);
  });
  process.on("SIGINT", () => {
    server.server.close();
    process.exit(0);
  });
}

/**
 * @async
 * @function processPackage
 * @param {!string} repo
 * @param {!URL} URL
 * @returns {Promise<void>}
 */
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
    const fullDependencies = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    let deps = Object.keys(fullDependencies);
    let extDeps = Object.keys(pkg.dependencies || {});
    if (FILTER_ORG === "ok") {
      deps = deps.filter((name) => name.startsWith(npmOrg));
      extDeps = extDeps.filter((name) => !name.startsWith(npmOrg));
    }

    projectLink[repo.name].currVersion = pkg.version;
    projectLink[repo.name].extDeps = extDeps.reduce((prev, curr) => {
      prev[curr] = fullDependencies[curr];

      return prev;
    }, {});

    const cleanPkgName = pkg.name.startsWith("@") ? pkg.name.split("/")[1].toLowerCase() : pkg.name.toLowerCase();
    if (cleanPkgName !== repo.name) {
      // console.log(`cleanPkg => ${cleanPkgName}, repo => ${repo.name}`);
      repoPkgLinker.set(cleanPkgName, repo.name);
    }

    for (const dep of extDeps) {
      fullExtDeps.add(dep);
    }

    for (const dep of deps) {
      const fName = dep.includes("/") ? dep.split("/")[1].toLowerCase() : dep;
      if (packageException.has(fName)) {
        continue;
      }

      if (Reflect.has(projectLink, fName)) {
        projectLink[repo.name].dependOn[fName] = fullDependencies[dep];
        projectLink[fName].uses[repo.name] = fullDependencies[dep];
      }
      else {
        orphans.push([fName, repo.name, fullDependencies[dep], dep]);
      }
    }
  }
  catch (err) {
    console.log(red(`Failed to retrieve project: ${yellow(repo.fullName)}, ${err.message}`));
  }
}

/**
 * @async
 * @function fetchExternal
 * @param {!string} dep
 * @returns {void}
 */
async function fetchExternal(dep) {
  let hasDependencies = false;
  try {
    const { dependencies = {} } = await _manifest(dep, { ...NPM_TOKEN });
    hasDependencies = Object.keys(dependencies).length > 0;
  }
  catch (error) {
    // Ignore
  }

  const uses = {};
  for (const [name, info] of Object.entries(projectLink)) {
    if (info.external || info.link) {
      continue;
    }

    if (Reflect.has(info.extDeps, dep)) {
      uses[name] = info.extDeps[dep];
    }
  }

  projectLink[dep] = {
    id: ++idCount,
    external: true,
    link: false,
    hasDependencies,
    uses
  };
}

/**
 * @async
 * @function main
 * @returns {Promise<void>}
 */
async function main() {
  console.time("gen_link");
  const fullRepositories = await fetch(process.env.ORG_NAME || "SlimIO", { token, kind: "orgs" });
  const filteredRepositories = fullRepositories
    .filter((row) => row.archived === false && !packageException.has(row.name.toLowerCase()))
    .map((row) => {
      const name = row.name.toLowerCase();
      const license = row.license || {};

      projectLink[name] = Object.seal({
        id: ++idCount,
        extDeps: [],
        link: false,
        currVersion: null,
        url: row.html_url,
        private: row.private,
        external: false,
        size: row.size || 0,
        license: license.name || "N/A",
        description: row.description || "",
        uses: {},
        dependOn: {}
      });

      return {
        id: row.id,
        fullName: row.full_name,
        name,
        defaultBranch: row.default_branch
      };
    });

  await Promise.all(filteredRepositories
    .map((repo) => processPackage(repo, new URL(`https://api.github.com/repos/${repo.fullName}/contents/package.json`))));
  await Promise.all([...fullExtDeps].map((dep) => fetchExternal(dep)));

  for (let id = 0; id < orphans.length; id++) {
    const [name, repoName, value] = orphans[id];
    if (!repoPkgLinker.has(name)) {
      continue;
    }
    const fixName = repoPkgLinker.get(name);
    const fixRepoName = Reflect.has(projectLink, repoName) ? repoName : repoPkgLinker.get(repoName) || repoName;

    projectLink[fixName].uses[fixRepoName] = value;
    if (!projectLink[fixRepoName].external) {
      projectLink[fixRepoName].dependOn[fixName] = value;
    }
  }

  console.timeEnd("gen_link");
  console.log("\nOrphans: ");
  console.log(orphans);

  // Write file on the disk!
  await writeFile(join(__dirname, "data", `${process.env.ORG_NAME}.json`), JSON.stringify(projectLink, null, 4));
  await startHTTPServer(projectLink);
}

const [arg = ""] = process.argv.slice(2);
if (arg.startsWith("--skip")) {
  const data = readFileSync(LINK_FILE, "utf-8");
  startHTTPServer(JSON.parse(data)).catch(console.error);
}
else {
  main().catch(console.error);
}
