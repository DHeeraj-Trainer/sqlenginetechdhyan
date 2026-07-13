// @lovable.dev/vite-tanstack-config already includes core plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // alasql references optional React Native / Node build deps we never use.
        { find: /^react-native$/, replacement: "/dev-server/src/legacy/empty-shim.js" },
        { find: /^react-native-fs$/, replacement: "/dev-server/src/legacy/empty-shim.js" },
        { find: /^react-native-fetch-blob$/, replacement: "/dev-server/src/legacy/empty-shim.js" },
      ],
    },
  },
});
