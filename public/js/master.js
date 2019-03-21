document.addEventListener("DOMContentLoaded", async() => {
    const raw = await fetch("/data", {
        method: "GET",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    });
    const projects = await raw.json();
    const internal = Object.entries(projects).filter(([, info]) => !info.external);
    const external = Object.entries(projects).filter(([, info]) => info.external);

    const nodes = [];
    const edges = [];
    let highlightActive = false;
    let activeNode = null;
    let activeNodeId = null;
    let id = 0;

    for (const [label, info] of external) {
        info.id = ++id;
        nodes.push({ id: info.id, label, color: "#673AB7" });
    }

    for (const [label, info] of internal) {
        info.id = ++id;
        nodes.push({ id: info.id, label, color: "#E65100" });
        for (const dep of info.extDeps) {
            if (!Reflect.has(projects, dep)) {
                continue;
            }
            edges.push({ from: info.id, to: projects[dep].id });
        }
    }

    for (const [label, info] of internal) {
        for (const dep of info.dependOn) {
            if (!Reflect.has(projects, dep)) {
                continue;
            }
            edges.push({ from: info.id, to: projects[dep].id });
        }
    }


    // create a network
    const container = document.getElementById("network");

    // provide the data in the vis format
    const idToName = new Map();
    for (const [name, info] of Object.entries(projects)) {
        idToName.set(Number(info.id), name);
    }

    const nodesDataset = new vis.DataSet(nodes);
    const edgesDataset = new vis.DataSet(edges);
    const allNodes = nodesDataset.get({ returnType: "Object" });
    const data = { nodes: nodesDataset, edges: edgesDataset };
    const options = {
        nodes: {
            shape: "box",
            size: 24,
            font: {
                face: "Roboto",
                vadjust: 0.5,
                size: 22,
                color: "#FFF"
            }
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

    // initialize your network!
    const network = new vis.Network(container, data, options);
    network.on("click", neighbourhoodHighlight);
    network.on("click", updateProjectDesc);

    async function updateProjectDesc(params) {
        const menu = document.getElementById("menu");

        if (params.nodes.length > 0) {
            menu.innerHTML = "";
            const nodeId = params.nodes[0];
            const selectedNode = idToName.get(nodeId);
            const currProject = projects[selectedNode];
            const template = document.getElementById("project");

            activeNode = document.importNode(template.content, true);
            const H1 = activeNode.querySelector(".name");
            H1.textContent = selectedNode;

            if (currProject.external) {
                let uri = `/${selectedNode}`;
                if (selectedNode.startsWith("@")) {
                    const [org, name] = selectedNode.split("/");
                    uri = `/${name}/${org}`;
                }

                const raw = await fetch(uri, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json"
                    }
                });
                const manifest = await raw.json();
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
            }
            else {
                const span = activeNode.querySelector(".desc");
                span.textContent = currProject.description;

                const size = activeNode.querySelector(".size");
                size.textContent = `${currProject.size}kB`;

                const license = activeNode.querySelector(".license");
                license.textContent = currProject.license;
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
        // if something is selected:
        if (params.nodes.length > 0) {
            highlightActive = true;
            const selectedNode = params.nodes[0];
            let allConnectedNodes = [];

            // mark all nodes as hard to read.
            for (const nodeId in allNodes) {
                allNodes[nodeId].color = "rgba(200, 200, 200, 0.10)";
                if (allNodes[nodeId].hiddenLabel === undefined) {
                    allNodes[nodeId].hiddenLabel = allNodes[nodeId].label;
                    allNodes[nodeId].label = undefined;
                }
            }
            const connectedNodes = network.getConnectedNodes(selectedNode);

            // get the second degree nodes
            for (let id = 0; id < connectedNodes.length; id++) {
                allConnectedNodes = allConnectedNodes.concat(network.getConnectedNodes(connectedNodes[id]));
            }

            // all second degree nodes get a different color and their label back
            for (let id = 0; id < allConnectedNodes.length; id++) {
                allNodes[allConnectedNodes[id]].color = "#607D8B";
                if (allNodes[allConnectedNodes[id]].hiddenLabel !== undefined) {
                    allNodes[allConnectedNodes[id]].label = allNodes[allConnectedNodes[id]].hiddenLabel;
                    allNodes[allConnectedNodes[id]].hiddenLabel = undefined;
                }
            }

            // all first degree nodes get their own color and their label back
            for (let id = 0; id < connectedNodes.length; id++) {
                allNodes[connectedNodes[id]].color = undefined;
                if (allNodes[connectedNodes[id]].hiddenLabel !== undefined) {
                    allNodes[connectedNodes[id]].label = allNodes[connectedNodes[id]].hiddenLabel;
                    allNodes[connectedNodes[id]].hiddenLabel = undefined;
                }
            }

            // the main node gets its own color and its label back.
            allNodes[selectedNode].color = undefined;
            if (allNodes[selectedNode].hiddenLabel !== undefined) {
                allNodes[selectedNode].label = allNodes[selectedNode].hiddenLabel;
                allNodes[selectedNode].hiddenLabel = undefined;
            }
        }
        else if (highlightActive) {
            highlightActive = false;
            for (const nodeId in allNodes) {
                const fName = idToName.get(Number(nodeId));
                allNodes[nodeId].color = projects[fName].external ? "#673AB7" : "#E65100";

                if (allNodes[nodeId].hiddenLabel !== undefined) {
                    allNodes[nodeId].label = allNodes[nodeId].hiddenLabel;
                    allNodes[nodeId].hiddenLabel = undefined;
                }
            }
        }

        // transform the object into an array
        const updateArray = [];
        for (nodeId in allNodes) {
            if (Reflect.has(allNodes, nodeId)) {
                updateArray.push(allNodes[nodeId]);
            }
        }
        nodesDataset.update(updateArray);
    }
});
