import { defineNitroConfig } from "nitropack/config";

const includeEditorDist = process.env.NITRO_PUBLIC_DIST === "1";

export default defineNitroConfig({
  compatibilityDate: "2025-07-15",
  srcDir: "server",
  preset: "node-server",
  publicAssets: includeEditorDist
    ? [{ dir: "../vendor/open-pencil/dist", baseURL: "/" }]
    : [],
  routeRules: {
    "/": {
      headers: { "cache-control": "no-cache" },
    },
    "/index.html": {
      headers: { "cache-control": "no-cache" },
    },
    "/assets/**": {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  },
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
