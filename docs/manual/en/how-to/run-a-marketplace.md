# Run your own marketplace

This guide runs a marketplace repository with Docker and adds it to Keyring Notes.

It is for people who share their own widgets, themes or languages, publicly or on a home network.

> [!NOTE]
> To install packages from your repository in the app, see [Install packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/install-packages.md).

To make the packages themselves, see [Publish marketplace packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md) in the Keyring Notes repository.

## Choose how to host

A repository is a folder of static files, so you have two choices:

- **Any static host.** Run `pkg index` on your folder and upload it. See [Host the repository](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md#host-the-repository).
- **The marketplace server image.** It rebuilds `index.json` by itself and serves the files with the right headers. The rest of this guide uses it.

The image does not contain any packages. You keep them in a folder on your server and mount it into the container.

## Requirements

- Docker. Compose v2 for [Option 1](#option-1-run-with-docker-compose), Git for [Option 2](#option-2-build-without-a-clone).
- Network access to `github.com` and the npm registry while the image builds. The build downloads the Keyring Notes source and its dependencies.

BuildKit (`docker buildx`) is not required. Without it, Docker falls back to the classic builder and prints a deprecation warning.

## Lay out your packages

Put your packages in one folder laid out as `<scope>/<name>/<version>/`:

```text
/srv/my-market/packages/
└── me/
    └── clock/
        ├── 1.0.0/
        └── 1.1.0/
```

The server mounts this folder at `/srv/market/packages` and writes `index.json` next to it, inside the container.

## Option 1: Run with Docker Compose

1. Clone this repository and copy the example settings:

   ```bash
   git clone https://github.com/jang2162/keyring-notes-marketplace.git
   cd keyring-notes-marketplace
   cp .env.example .env
   ```

2. In `.env`, set `MARKET_PACKAGES` to your package folder:

   ```bash
   MARKET_PACKAGES=/srv/my-market/packages
   ```

   The default is `./packages` in the clone. Create the folder before you start the server. Otherwise Docker creates it as an empty folder owned by `root`.

3. Build and start the server:

   ```bash
   docker compose up -d --build
   ```

4. Open `http://127.0.0.1:8080/index.json`. It lists your packages.

The server rebuilds `index.json` when it starts and every `MARKET_REBUILD_SECONDS` seconds, so new versions appear without a restart. If a package is invalid, the server keeps the last good `index.json` and prints the reason:

```bash
docker compose logs market
```

The repository ignores `.env`, `compose.override.yaml` and `packages/`.

## Option 2: Build without a clone

Docker can build the image straight from this repository:

```bash
docker build -t keyring-notes-market https://github.com/jang2162/keyring-notes-marketplace.git#main
```

With the classic builder, the Docker command line clones the repository, so Git must be installed where you run it.

Start the container with your package folder mounted read-only:

```bash
docker run -d --name keyring-notes-market --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /srv/my-market/packages:/srv/market/packages:ro \
  -e MARKET_NAME="My widgets" \
  -e MARKET_REBUILD_SECONDS=60 \
  keyring-notes-market
```

Open `http://127.0.0.1:8080/index.json`. Read the logs with `docker logs keyring-notes-market`.

To update, build again and replace the container:

```bash
docker build -t keyring-notes-market https://github.com/jang2162/keyring-notes-marketplace.git#main
docker rm -f keyring-notes-market
```

Then run the same `docker run` command again.

## Check a package

The image contains the Keyring Notes command line, so you can check a version folder without a Keyring Notes clone. With Compose:

```bash
docker compose exec market node server/dist/cli.js pkg check /srv/market/packages/me/clock/1.0.0
```

```text
OK: @me/clock@1.0.0 (widget)
```

With `docker run`, use `docker exec keyring-notes-market` instead of `docker compose exec market`. The command exits with code `1` on an error. See [Check a package and build the index](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md#check-a-package-and-build-the-index) for what it checks.

## Add new versions

1. Copy the new version folder into a temporary folder on the same disk as your package folder.
2. Check it with the image. `pkg check` does not read the folder path, so you can mount the folder anywhere:

   ```bash
   docker run --rm -v /srv/my-market/incoming/1.2.0:/check:ro keyring-notes-market:local node server/dist/cli.js pkg check /check
   ```

   The image is `keyring-notes-market:local` with Compose and `keyring-notes-market` with Option 2.
3. Move it into place, for example to `/srv/my-market/packages/me/clock/1.2.0/`. A move is instant, so the server never reads a half-copied version.
4. Wait up to `MARKET_REBUILD_SECONDS` seconds, then check that `index.json` lists the new version.

> [!WARNING]
> Do not change the files of a version you have already published. Devices that installed it have locked its checksum, and a changed file no longer matches. Publish a fix as a new version.

## Choose the Keyring Notes version

The image builds the market server from one commit of the Keyring Notes repository. The `KEYRING_REF` build argument in the `Dockerfile` names that commit.

This repository raises `KEYRING_REF` when Keyring Notes changes the package format or the market server. To build from another commit, pass a full commit SHA. With Compose, add it to `compose.override.yaml`:

```yaml
services:
  market:
    build:
      args:
        KEYRING_REF: <COMMIT_SHA>
```

With `docker build`, add `--build-arg KEYRING_REF=<COMMIT_SHA>`.

## Put it behind HTTPS

Keyring Notes downloads only from `https:` repositories. Plain `http:` and private network addresses work only when the Keyring Notes server operator allows them with `KEYRING_MARKET_ALLOW_HTTP` and `KEYRING_MARKET_ALLOW_PRIVATE` (see [Configuration](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/configuration.md)), or on a desktop app that allows them on that device.

Put the marketplace server behind a reverse proxy that serves HTTPS, as in [Setup A](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/deploy-with-docker.md#setup-a-behind-a-reverse-proxy) for Keyring Notes itself. Create `compose.override.yaml`, close the host port and join the proxy network:

```yaml
services:
  market:
    ports: !reset []
    networks: [proxy]
networks:
  proxy:
    external: true
    name: your-proxy-network
```

With `docker run`, drop `-p` and add `--network your-proxy-network`.

Point a host name at the `market` service (or the `keyring-notes-market` container) on port `8080`.

> [!WARNING]
> Do not let the proxy compress responses. Keyring Notes refuses compressed packages.

## Add it in Keyring Notes

Add the repository address to `marketplace.repos` in the [shared settings file](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/reference.md#shared-settings-file). Keep the official repository first if you still want it:

```yaml
marketplace:
  repos:
    - url: https://keyring-notes-marketplace.develma.com/
    - url: https://market.example.com/
```

Repositories higher in the list win when two have the same package id.

## Next steps

- [Publish marketplace packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md)
- [Install packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/install-packages.md)
