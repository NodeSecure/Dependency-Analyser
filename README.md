# projects-view
![version](https://img.shields.io/badge/version-1.0.0-blue.svg)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/is/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)

SlimIO Projects Global Overview. This project has been primaly designed for SlimIO but work with any kind of organisation who want to achieve a similar result.

<p align="center">
    <img src="https://i.imgur.com/DE2sz4D.png" height="400">
</p>

## Requirements
- Node.js v10 or higher

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
EXCEPT_PKG=eslint-config,is
```

Run `npm start` for a full run.. or just run the http server with `npm run skip` (full run must be executed at least one time).

## Known issues
- If repository name doesn't match the package name it produce Orphan.
- /:pkg doesn't support package with organisation (it should replace `/` by `#`)

## License
MIT
