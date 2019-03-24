function formatBytes(bytes, decimals) {
    if (bytes === 0) {
        return "0 B";
    }
    const dm = decimals <= 0 ? 0 : decimals || 2;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const id = Math.floor(Math.log(bytes) / Math.log(1024));

    // eslint-disable-next-line
    return parseFloat((bytes / Math.pow(1024, id)).toFixed(dm)) + ' ' + sizes[id];
}

async function request(path, customHeaders = Object.create(null)) {
    const headers = {
        Accept: "application/json"
    };

    const raw = await fetch(path, {
        method: "GET",
        headers: Object.assign({}, headers, customHeaders)
    });
    const json = await raw.json();

    return json;
}

function transformURI(uri = "/api", selectedNode) {
    let ret = `${uri}/${selectedNode}`;
    if (selectedNode.startsWith("@")) {
        const [org, name] = selectedNode.split("/");
        ret = `${uri}/${name}/${org}`;
    }

    return ret;
}
