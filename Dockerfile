# Keyring Notes marketplace server.
#
# The server code is not copied into this repository. The build downloads the Keyring Notes
# source at KEYRING_REF, builds only core and the server (no web UI), and runs
# `keyring pkg serve /srv/market`. It rebuilds /srv/market/index.json at start and every
# MARKET_REBUILD_SECONDS, and serves /index.json and /packages/... as static files.
#
# Packages are not in the image. Mount a folder at /srv/market/packages (read-only is fine).
#
#   docker build -t keyring-notes-market .
#   docker build -t keyring-notes-market https://github.com/jang2162/keyring-notes-marketplace.git
#
# Only classic Dockerfile features are used, so the build works without BuildKit (docker buildx).
ARG NODE_IMAGE=node:22-bookworm-slim

# ── Source: the Keyring Notes repository at a fixed commit ──
FROM ${NODE_IMAGE} AS source
# A full commit SHA of https://github.com/jang2162/keyring-notes. Raise it when the app changes
# the package format or the market server. Do not use a v* tag: those run the app's macOS release.
ARG KEYRING_REF=fbdad211a7511620cc67504d6f8900d583c5cb11
ARG KEYRING_REPO=https://github.com/jang2162/keyring-notes
RUN echo "$KEYRING_REF" | grep -Eqx '[0-9a-f]{40}' || { echo 'KEYRING_REF must be a full commit SHA' >&2; exit 1; }
# A GitHub archive needs no git in the build image.
ADD ${KEYRING_REPO}/archive/${KEYRING_REF}.tar.gz /tmp/keyring-notes.tar.gz
RUN mkdir /src \
 && tar -xzf /tmp/keyring-notes.tar.gz -C /src --strip-components=1 \
 && rm /tmp/keyring-notes.tar.gz

# ── Build: core and the server only ──
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY --from=source /src/package.json /src/pnpm-lock.yaml /src/pnpm-workspace.yaml /src/tsconfig.base.json ./
COPY --from=source /src/packages/core/package.json packages/core/
COPY --from=source /src/server/package.json server/
COPY --from=source /src/web/package.json web/
COPY --from=source /src/app/package.json app/
# corepack fetches the pnpm version named in package.json (packageManager)
RUN corepack enable && pnpm install --frozen-lockfile --filter "@keyring-notes/server..."
COPY --from=source /src/packages packages
COPY --from=source /src/server server
RUN pnpm --filter @keyring-notes/core build && pnpm --filter @keyring-notes/server build

# ── Runtime dependencies of the server only ──
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY --from=source /src/package.json /src/pnpm-lock.yaml /src/pnpm-workspace.yaml ./
COPY --from=source /src/packages/core/package.json packages/core/
COPY --from=source /src/server/package.json server/
COPY --from=source /src/web/package.json web/
COPY --from=source /src/app/package.json app/
RUN corepack enable && pnpm install --frozen-lockfile --prod --filter "@keyring-notes/server..."

# ── Run ──
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    MARKET_HOST=0.0.0.0 \
    MARKET_PORT=8080
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=source /src/package.json ./
COPY --from=source /src/packages/core/package.json packages/core/
COPY --from=deps /app/packages/core/node_modules packages/core/node_modules
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=source /src/server/package.json server/
COPY --from=deps /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist
# index.json is written to /srv/market, so packages/ can be mounted read-only
RUN mkdir -p /srv/market/packages && chown -R node:node /srv/market
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8080/index.json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/cli.js", "pkg", "serve", "/srv/market"]
