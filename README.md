# Dependency Analyser
![version](https://img.shields.io/badge/version-1.0.0-blue.svg)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/is/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)
![dep](https://img.shields.io/david/SlimIO/Dependency-Analyser.svg)
![size](https://img.shields.io/github/languages/code-size/SlimIO/Dependency-Analyser.svg)

SlimIO Dependency Analyser (**Draw a network of all projects of a given Organisation**). This project has been primaly designed for SlimIO but work with any kind of organisation who want to achieve a similar result.

<p align="center">
    <img src="https://i.imgur.com/xd4fGrW.png" height="400" style="border: 2px solid #212121">
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v10 or higher

## Getting Started

```bash
$ git clone https://github.com/SlimIO/ProjectsView.git
$ npm ci
```

Then create a local `.env` file with a Personal Github token
```
GIT_TOKEN=
HTTP_PORT=1337
ORG_NAME=SlimIO
NPM_NAME=@slimio
FILTER_ORG=ok
EXCEPT_PKG=eslint-config,is
```

Run `npm start` for a full run.. or just run the http server with `npm run skip` (full run must be executed at least one time).

## API
TBC

## Dependencies

|Name|Refactoring|Security Risk|Usage|
|---|---|---|---|
|[@polka/send-type](https://github.com/lukeed/polka)|Minor|Low|HTTP response helper|
|[dotenv](https://github.com/motdotla/dotenv#readme)|⚠️Major|Low|Env files|
|[httpie](https://github.com/lukeed/httpie#readme)|⚠️Major|Low|HTTP request|
|[kleur](https://github.com/lukeed/kleur#readme)|Minor|Low|CLI color|
|[make-promises-safe](https://github.com/mcollina/make-promises-safe#readme)|⚠️Major|Low|Promises don't exit process when fail|
|[pacote](https://github.com/zkat/pacote#readme)|Minor|High|Download npm package|
|[polka](https://github.com/lukeed/polka)|⚠️Major|High|Native HTTP server|
|[repos](https://github.com/jonschlinkert/repos)|⚠️Major|High|Get all GIT repositories|
|[serve-static](https://github.com/expressjs/serve-static#readme)|⚠️Major|High|Serve static files|


## Known issues
- If repository name doesn't match the package name it produce Orphan.

## License
MIT
