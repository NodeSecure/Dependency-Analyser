# Dependency Analyser
![version](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/NodeSecure/Dependency-Analyser/master/package.json&query=$.version&label=Version)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/NodeSecure/Dependency-Analyser/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)
![dep](https://img.shields.io/david/NodeSecure/Dependency-Analyser.svg)
![size](https://img.shields.io/github/languages/code-size/NodeSecure/Dependency-Analyser.svg)

Draw a graphic network of a given Github or Gitlab organization. This project has been primaly designed for SlimIO but work with any kind of organisation who want to achieve a similar result.

<p align="center">
    <img src="https://media.discordapp.net/attachments/359783689040953354/622219583121784893/unknown.png" height="400" style="border: 2px solid #212121">
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v16 or higher

## Getting Started

```bash
$ git clone https://github.com/NodeSecure/Dependency-Analyser.git
$ cd Dependency-Analyser
$ npm ci
$ npm start
```

> 👀 use `npm start` for a complete run.. or just run the http server with `npm run skip` (complete run must be executed at least one time).

## Environment Variables

To configure the project you have to set environment variables. These variables can be set in a **.env** file.
```
GIT_TOKEN=
NPM_TOKEN=
HTTP_PORT=1337
ORG_NAME=SlimIO
NPM_NAME=@slimio
FILTER_ORG=ok
EXCEPT_PKG=eslint-config,is
```

To known how to get your **GIT_TOKEN** and **NPM_TOKEN** follow the [Governance Guide](https://github.com/SlimIO/Governance/blob/master/docs/tooling.md#environment-variables).

## Known issues
- If repository name doesn't match the package name it produce Orphan.

## License
MIT
