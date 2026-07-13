// @lovable.dev/vite-tanstack-config already includes core plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // Force alasql's browser build; the default entry pulls Node/RN-only deps.
        { find: /^alasql$/, replacement: "alasql/dist/alasql.min.js" },
        { find: /^react-native$/, replacement: "/dev-server/src/legacy/empty-shim.js" },
        { find: /^react-native-fs$/, replacement: "/dev-server/src/legacy/empty-shim.js" },
        { find: /^react-native-fetch-blob$/, replacement: "/dev-server/src/legacy/empty-shim.js" },
      ],
    },
  },
});
