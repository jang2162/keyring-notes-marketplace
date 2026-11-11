# Keyring Notes marketplace server.
#
# Builds this repository's CLI (src/) into one file, dist/cli.js, and runs
# `keyring-market serve /srv/market`. It rebuilds /srv/market/index.json at start and every
# MARKET_REBUILD_SECONDS, and serves /index.json and /packages/... as static files.
#
# The package format checks come from @keyring-notes/core, pinned in package.json to a commit
# of the Keyring Notes repository; `pnpm install` downloads that commit from GitHub.
#
# Packages are not in the image. Mount a folder at /srv/market/packages (read-only is fine).
#
#   docker build -t keyring-notes-market .
#   docker build -t keyring-notes-market https://github.com/jang2162/keyring-notes-marketplace.git
#
# Only classic Dockerfile features are used, so the build works without BuildKit (docker buildx).
ARG NODE_IMAGE=node:22-bookworm-slim

# ── Build: bundle the CLI with core inside ──
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# corepack fetches the pnpm version named in package.json (packageManager)
RUN corepack enable && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY scripts scripts
COPY src src
RUN pnpm build

# ── Run: Node and the bundle only, no node_modules ──
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    MARKET_HOST=0.0.0.0 \
    MARKET_PORT=8080
WORKDIR /app
COPY --from=build /app/dist/cli.js dist/cli.js
# index.json is written to /srv/market, so packages/ can be mounted read-only
RUN ln -s /app/dist/cli.js /usr/local/bin/keyring-market \
 && mkdir -p /srv/market/packages && chown -R node:node /srv/market
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8080/index.json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["keyring-market", "serve", "/srv/market"]
