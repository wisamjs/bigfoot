import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The same `@/` alias as tsconfig.json, so tests import (and vi.mock) modules the way the app does.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
