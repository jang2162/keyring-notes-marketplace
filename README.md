<p align="center"><b>English</b> | <a href="README.ko.md">한국어</a></p>

<h1 align="center">keyring-notes-marketplace</h1>

<p align="center">A Docker setup that serves your Keyring Notes widgets, themes and languages as a marketplace repository</p>

## Overview

Keyring Notes installs widgets, themes and languages from marketplace repositories, which are folders of static files with an `index.json`.
This repository builds a small server that rebuilds `index.json` from your package folder and serves the files as the app expects.
It holds only the Docker setup: the server code comes from the [Keyring Notes repository](https://github.com/jang2162/keyring-notes) at a fixed commit, and your packages stay in a folder on your server.
It is for people who run their own marketplace, publicly or on a home network, and for the operators of the official one.

## Features

- Rebuilds `index.json` at start and every 60 seconds, so new versions appear without a restart.
- Keeps the last good `index.json` when a package is invalid, and logs the reason.
- Serves files byte for byte, uncompressed, with the cache headers the app expects.
- Mounts your package folder read-only, so the image never holds your packages.
- Builds with the classic Docker builder, so BuildKit (`docker buildx`) is not required.

## Installation

Requirements: Docker with Compose v2, and network access to `github.com` and the npm registry while the image builds.

```bash
git clone https://github.com/jang2162/keyring-notes-marketplace.git
cd keyring-notes-marketplace
cp .env.example .env
```

Verify the Compose setup:

```bash
docker compose config --services
```

```text
market
```

## Quick Start

1. Create the package folder. Put packages in it as `<scope>/<name>/<version>/`.

   ```bash
   mkdir -p packages
   ```

2. Build and start the server. The first build takes a few minutes.

   ```bash
   docker compose up -d --build
   ```

3. Read the index:

   ```bash
   curl http://127.0.0.1:8080/index.json
   ```

   With an empty folder, the result is:

   ```json
   {
     "format": 1,
     "name": "Keyring Notes",
     "packages": {}
   }
   ```

To serve it to the app over HTTPS, to build without a clone, or to pin a Keyring Notes version, see [Run your own marketplace](docs/manual/en/how-to/run-a-marketplace.md).

## Configuration

Set these in `.env`.

| Option | Default | Description |
| --- | --- | --- |
| `MARKET_PACKAGES` | `./packages` | Host folder with your packages. It is mounted read-only. |
| `MARKET_BIND` | `127.0.0.1` | Host address the port binds to. |
| `MARKET_PORT` | `8080` | Host port. |
| `MARKET_REBUILD_SECONDS` | `60` | How often `index.json` is rebuilt, in seconds. |
| `MARKET_NAME` | `Keyring Notes` | Repository name the app shows. |

## Documentation

- [Run your own marketplace](docs/manual/en/how-to/run-a-marketplace.md)
- [Publish marketplace packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md) (in the Keyring Notes repository)

## License

MIT License. See [LICENSE](LICENSE) for details.
