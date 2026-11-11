import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  compatibilityDate: "2025-07-15",
  srcDir: "server",
  preset: "node-server",
  esbuild: {
    options: {
      target: "esnext",
    },
  },
  externals: {
    external: [
      "@prisma/client",
      ".prisma/client",
      "@open-pencil/core",
      "@open-pencil/scene-graph",
      "@open-pencil/fig",
      "@open-pencil/kiwi",
      "@open-pencil/design-jsx",
      "@open-pencil/dom-css",
      "@open-pencil/pen",
    ],
  },
});
