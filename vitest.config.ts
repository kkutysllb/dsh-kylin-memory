import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    // The settings schema library is vendored (third_party/) — the runtime
    // only exists inside the host and as the committed vendored copy.
    alias: {
      "@deepseek-ai/schemastery": resolve(import.meta.dirname, "third_party/schemastery/index.mjs"),
      "@deepseek-ai/cosmokit": resolve(import.meta.dirname, "third_party/cosmokit/index.js"),
    },
  },
  test: {
    globals: true,
    testTimeout: 10_000,
  },
});
