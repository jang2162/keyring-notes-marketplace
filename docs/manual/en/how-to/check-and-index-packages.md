# Check and index packages

This guide uses the `keyring-market` command line to check a package version and build the `index.json` of a marketplace repository.

It is for people who make packages, and for people who host a repository on a static host instead of the marketplace server image.

> [!NOTE]
> The package format is described in [Publish marketplace packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md) in the Keyring Notes repository.

## Requirements

- Node.js 22.13 or later.
- pnpm 10. Run `corepack enable` once to get the version this repository names.
- Git.
- Network access to `github.com` and the npm registry while you install. The install downloads the Keyring Notes package checks from one commit of the Keyring Notes repository.

## Install the command line

1. Clone this repository and install its dependencies:

   ```bash
   git clone https://github.com/jang2162/keyring-notes-marketplace.git
   cd keyring-notes-marketplace
   pnpm install
   ```

2. Check one of the test packages to verify the install:

   ```bash
   pnpm --silent keyring-market check test/fixtures/market/packages/me/clock/1.0.0
   ```

   ```text
   OK: @me/clock@1.0.0 (widget)
   ```

Without `--silent`, pnpm also prints the script it runs before the output.

Run the commands from the clone or any folder inside it. Relative paths are read from the folder you run the command in. From another folder, point pnpm at the clone with `-C`:

```bash
pnpm --silent -C ~/keyring-notes-marketplace keyring-market check packages/me/clock/1.0.0
```

## Check a package

```bash
pnpm keyring-market check my-repo/packages/me/clock/1.0.0
```

`check <folder>` checks one version folder:

- The manifest, and the required and allowed files.
- Theme colors, language keys and widget message keys.
- The syntax of `frame.js`. It does not run `frame.js`.

On an error, it prints the reason and exits with code `1`:

```text
Error: The package is invalid (no_manifest)
```

Warnings do not fail the check. Each one is printed on a line that starts with `warning:`. They include missing language keys, unknown theme tokens, low contrast, dropped widget message keys, a large `frame.js` and display fields that are too long.

## Build the index

```bash
pnpm keyring-market index my-repo --name "My widgets"
```

```text
index.json written — packages: 1, versions: 2 (/home/me/my-repo/index.json)
```

`index <folder>` reads every version under `my-repo/packages/<scope>/<name>/<version>/` and writes `my-repo/index.json`:

- It checks every version and stops on the first error. The error names the folder.
- It measures each file and copies the display fields from each manifest.
- It keeps the `name` of an existing `index.json`. Without one, it uses `--name`, then the folder name.
- When the files have not changed, it leaves `index.json` untouched and prints `index.json unchanged`.

A display field over its limit is left out of `index.json`, not shortened. The command prints a warning such as `warning: @me/clock@1.0.0: display_too_long: description.en` and still exits with code `0`.

After you build the index, upload the whole folder to your static host.

## Serve a repository

To try a repository on your computer, serve it with the same server the Docker image runs:

```bash
pnpm keyring-market serve my-repo
```

```text
Serving the marketplace repository at http://127.0.0.1:8080/index.json
```

The server rebuilds `index.json` at start and every 60 seconds. It serves only `/index.json` and the package files. Stop it with `Ctrl+C`.

| Option | Environment variable | Default | Description |
| --- | --- | --- | --- |
| `--host <address>` | `MARKET_HOST` | `127.0.0.1` | Address to listen on |
| `--port <port>` | `MARKET_PORT` | `8080` | Port to listen on |
| `--rebuild-seconds <seconds>` | `MARKET_REBUILD_SECONDS` | `60` | How often `index.json` is rebuilt. `0` builds it once at start |
| `--name <name>` | `MARKET_NAME` | Folder name | Repository name, used when there is no `index.json` yet |

An option wins over its environment variable. To run the server for other people, use the Docker image in [Run your own marketplace](run-a-marketplace.md).

## Run the commands in Docker

The marketplace server image contains the same command line as `keyring-market`. With Docker Compose:

```bash
docker compose exec market keyring-market check /srv/market/packages/me/clock/1.0.0
```

To check a folder that is not mounted yet, mount it into a new container:

```bash
docker run --rm -v /srv/my-market/incoming/1.2.0:/check:ro keyring-notes-market:local keyring-market check /check
```

## Choose the output language

The command line prints English by default. To print Korean, set `KEYRING_LANG=ko`:

```bash
KEYRING_LANG=ko pnpm --silent keyring-market check my-repo/packages/me/clock/1.0.0
```

```text
통과: @me/clock@1.0.0 (widget)
```

Without `KEYRING_LANG`, it follows `LANG`.

## Next steps

- [Run your own marketplace](run-a-marketplace.md)
- [Publish marketplace packages](https://github.com/jang2162/keyring-notes/blob/main/docs/manual/en/how-to/publish-packages.md) (in the Keyring Notes repository)
