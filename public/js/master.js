document.addEventListener("DOMContentLoaded", async() => {
    // HTML Elements
    const container = document.getElementById("network");
    const template = document.getElementById("project");

    // CONSTANTS (for nodes colors)
    const C_EXT = "#673AB7";
    const C_INT = "#E65100";
    const C_OFF = "#607D8B";
    const C_TRS = "rgba(200, 200, 200, 0.05)";

    // Globals
    const nodes = [];
    const edges = [];
    const idToName = new Map();
    let highlightActive = false;
    let activeNode = null;
    let activeNodeId = null;
    let id = 5000;

    // Fetch data
    const projects = await request("/data");
    const projectsEntries = Object.entries(projects).filter(([, info]) => !info.link);

    for (const [label, info] of projectsEntries) {
        idToName.set(Number(info.id), label);
        nodes.push({ id: info.id, label, color: info.external ? C_EXT : C_INT });

        if (info.external) {
            continue;
        }

        for (const dep of Object.keys(info.extDeps)) {
            if (!Reflect.has(projects, dep)) {
                continue;
            }
            edges.push({ from: info.id, to: projects[dep].id });
        }

        for (const dep of Object.keys(info.dependOn)) {
            if (!Reflect.has(projects, dep)) {
                continue;
            }
            edges.push({ from: info.id, to: projects[dep].id });
        }
    }

    const nodesDataset = new vis.DataSet(nodes);
    const edgesDataset = new vis.DataSet(edges);
    const options = {
        nodes: {
            mass: 1.5,
            shape: "box",
            size: 24,
            font: {
                face: "Roboto",
                vadjust: 0.5,
                size: 22,
                color: "#ECEFF1",
                bold: "22px"
            },
            margin: 7.5,
            shadow: {
                enabled: true,
                color: "rgba(20, 20, 20, 0.2)"
            }
        },
        edges: {
            arrows: "from",
            hoverWidth: 2,
            selectionWidth: 2,
            width: 1.2
        },
        physics: {
            forceAtlas2Based: {
                gravitationalConstant: -26,
                centralGravity: 0.005,
                springLength: 230,
                springConstant: 0.18
            },
            maxVelocity: 150,
            solver: "forceAtlas2Based",
            timestep: 0.35,
            stabilization: { iterations: 150 }
        }
    };

    // Initialize network and add "click" events
    const network = new vis.Network(container, { nodes: nodesDataset, edges: edgesDataset }, options);
    network.on("click", neighbourhoodHighlight);
    network.on("click", updateProjectDesc);

    async function updateProjectDesc(params) {
        const menu = document.getElementById("menu");

        if (params.nodes.length > 0) {
            menu.innerHTML = "";
            const nodeId = params.nodes[0];
            const selectedNode = idToName.get(nodeId);
            const currProject = projects[selectedNode];

            activeNode = document.importNode(template.content, true);
            activeNode.querySelector(".name").textContent = selectedNode;

            const usesVer = {};
            if (currProject.external) {
                for (const dep of Object.keys(currProject.uses)) {
                    usesVer[dep] = projects[dep].extDeps[selectedNode];
                }

                const manifest = await request(transformURI("/api", selectedNode));
                const deps = Object.keys(manifest.dependencies || {});

                const tId = [];
                for (const dep of deps) {
                    const lId = ++id;
                    // eslint-disable-next-line
                    nodesDataset.add({ id: lId, label: dep, color: "#2979FF", x: params.pointer.canvas.x, y: params.pointer.canvas.y });
                    edgesDataset.add({ id: lId, from: nodeId, to: lId });
                    tId.push(lId);
                }
                activeNodeId = tId;

                const size = activeNode.querySelector(".li_size");
                const license = activeNode.querySelector(".li_license");

                size.style.display = "none";
                license.style.display = "none";
            }
            else {
                for (const dep of Object.keys(currProject.uses)) {
                    if (!Reflect.has(projects, dep) || projects[dep].external) {
                        continue;
                    }
                    usesVer[dep] = projects[dep].dependOn[selectedNode];
                }

                const span = activeNode.querySelector(".desc");
                const size = activeNode.querySelector(".size");
                const license = activeNode.querySelector(".license");
                const version = activeNode.querySelector(".version");

                span.textContent = currProject.description;
                size.textContent = formatBytes(currProject.size);
                license.textContent = currProject.license;
                version.textContent = currProject.currVersion || "v0.0.1";
            }

            const vsd = activeNode.querySelector(".vsd");
            const fragment = document.createDocumentFragment();
            for (const [name, version] of Object.entries(usesVer)) {
                const li = document.createElement("li");
                li.innerHTML = `${name}: <b>${version}</b>`;
                fragment.appendChild(li);
            }
            vsd.appendChild(fragment);

            // BundlePhobia
            let uri = currProject.external ? `/api/size/${selectedNode}` : `/api/size/${selectedNode}/@slimio`;
            if (selectedNode.startsWith("@")) {
                const [org, name] = selectedNode.split("/");
                uri = `/api/size/${name}/${org}`;
            }

            try {
                const size = await request(uri);
                const bunMin = activeNode.querySelector(".bun_min");
                const bunGZIP = activeNode.querySelector(".bun_gzip");
                const bunFull = activeNode.querySelector(".bun_full");

                const fullSize = size.dependencySizes.reduce((prev, curr) => prev + curr.approximateSize, 0);
                bunMin.textContent = formatBytes(size.size);
                bunGZIP.textContent = formatBytes(size.gzip);
                bunFull.textContent = formatBytes(fullSize);
            }
            catch (err) {
                activeNode.getElementById("bundle").classList.add("hide");
                activeNode.querySelector(".npm_size").style.display = "none";
            }

            menu.appendChild(activeNode);
        }
        else if (activeNode !== null) {
            menu.innerHTML = "<p>Select a project</p>";
            activeNode = null;
            if (activeNodeId !== null) {
                for (const id of activeNodeId) {
                    nodesDataset.remove({ id });
                }
                activeNodeId = null;
            }
        }
    }

    function neighbourhoodHighlight(params) {
        const allNodes = nodesDataset.get({ returnType: "Object" });

        // if something is selected:
        if (params.nodes.length > 0) {
            highlightActive = true;
            const selectedNode = params.nodes[0];

            // mark all nodes as hard to read.
            for (const node of Object.values(allNodes)) {
                node.color = C_TRS;
            }

            // get the second degree nodes
            const connectedNodes = network.getConnectedNodes(selectedNode);
            const allConnectedNodes = [];
            for (let id = 0; id < connectedNodes.length; id++) {
                allConnectedNodes.push(...network.getConnectedNodes(connectedNodes[id]));
            }

            // all second degree nodes get a different color and their label back
            for (let id = 0; id < allConnectedNodes.length; id++) {
                allNodes[allConnectedNodes[id]].color = C_OFF;
            }

            // all first degree nodes get their own color and their label back
            for (let id = 0; id < connectedNodes.length; id++) {
                allNodes[connectedNodes[id]].color = undefined;
            }

            // the main node gets its own color and its label back.
            allNodes[selectedNode].color = undefined;
        }
        else if (highlightActive) {
            highlightActive = false;
            for (const node of Object.values(allNodes)) {
                const id = Number(node.id);
                if (id >= 5000) {
                    continue;
                }
                const fName = idToName.get(id);
                node.color = projects[fName].external ? C_EXT : C_INT;
            }
        }

        // transform the object into an array
        nodesDataset.update(Object.values(allNodes));
    }
});
