// @lovable.dev/vite-tanstack-config already includes core plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const emptyShim = path.resolve(__dirname, "src/lib/empty-shim.ts");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
    resolve: {
      alias: [
        // alasql references optional React Native / Node build deps we never use in the browser.
        { find: /^react-native$/, replacement: emptyShim },
        { find: /^react-native-fs$/, replacement: emptyShim },
        { find: /^react-native-fetch-blob$/, replacement: emptyShim },
      ],
    },
  },
});

