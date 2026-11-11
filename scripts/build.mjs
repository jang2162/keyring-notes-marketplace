// Bundles the CLI into one file, dist/cli.js, with @keyring-notes/core and its dependencies inside.
//
// core comes from a git commit and has no dist/ (its build output is not in git), so the bundle reads
// core's TypeScript source through its "keyring-source" export condition. The result needs only Node
// at run time: the Docker image copies dist/cli.js and no node_modules.
import { chmod } from "node:fs/promises";
import { build } from "esbuild";

const outfile = "dist/cli.js";
await build({
  entryPoints: ["src/cli.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  conditions: ["keyring-source"],
  // yaml is CommonJS and calls require("process"); an ESM bundle has no require, so give it one
  banner: { js: '#!/usr/bin/env node\nimport { createRequire as __createRequire } from "node:module";\nconst require = __createRequire(import.meta.url);' },
  logLevel: "warning",
});
await chmod(outfile, 0o755);
