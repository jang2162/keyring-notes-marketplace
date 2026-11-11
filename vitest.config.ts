import { defineConfig } from "vitest/config";

// core has no dist/ in git: use its TypeScript source ("keyring-source" export condition).
// It sits in node_modules, so Vitest must transform it instead of handing it to Node as is.
export default defineConfig({
  resolve: { conditions: ["keyring-source"] },
  ssr: { resolve: { conditions: ["keyring-source"] } },
  test: {
    server: { deps: { inline: ["@keyring-notes/core"] } },
  },
});
