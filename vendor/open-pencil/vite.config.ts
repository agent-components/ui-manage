import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import IconsResolver from "unplugin-icons/resolver";
import Icons from "unplugin-icons/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig, loadEnv, type Plugin } from "vite";

import packageJson from "./package.json";
import { viteBuildTarget } from "./src/app/shell/support/baseline";
import { createOpenPencilAliases } from "./vite/aliases";
import {
  localAutomationRoute,
  localAutomationToken,
  openPencilAutomationPlugin,
} from "./vite/automation-stub";
import { bootSplashPlugin } from "./vite/boot-splash";
import { donationDefine } from "./vite/funding";
import { aiIconCollection } from "./vite/icons";
import { inlineScriptPlugin } from "./vite/inline-script";
import { metricsBrandPlugin } from "./vite/metrics";
import { openPencilCjsInterop, openPencilForceBundle } from "./vite/cjs-deps";
import { openPencilPwaPlugin } from "./vite/pwa";
import { rawMarkdownPlugin } from "./vite/raw-markdown";
import {
  ensureHoistedCjsDeps,
  rewriteBunCjsPlugin,
} from "./vite/rewrite-bun-cjs";
import { createDevServerOptions } from "./vite/server";

ensureHoistedCjsDeps(__dirname);

const host = process.env.TAURI_DEV_HOST;
const uiManageEmbed = process.env.OPENPENCIL_UI_MANAGE === "1";
const automationRoute = localAutomationRoute(host);

/**
 * Serves CanvasKit wasm at `/canvaskit.wasm` (Core's default locator) and injects
 * runtime-assets/install. Avoids importing `@open-pencil/core/node/vite` in config.
 */
function openPencilAssets(): Plugin {
  const wasmPath = resolve(
    __dirname,
    "node_modules/@open-pencil/canvaskit/dist/canvaskit.wasm"
  );
  return {
    name: "open-pencil:assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/canvaskit.wasm") return next();
        res.setHeader("Content-Type", "application/wasm");
        res.setHeader("Cache-Control", "no-cache");
        const publicWasm = resolve(__dirname, "public/canvaskit.wasm");
        const file = existsSync(publicWasm) ? publicWasm : wasmPath;
        createReadStream(file).pipe(res);
      });
    },
    transformIndexHtml: {
      order: "pre",
      handler() {
        return [
          {
            tag: "script",
            attrs: { type: "module" },
            children: `import ${JSON.stringify(
              "@open-pencil/core/runtime-assets/install"
            )}`,
            injectTo: "head-prepend",
          },
        ];
      },
    },
  };
}

export default defineConfig(async ({ command, mode }) => {
  const metrics = mode === "metrics";
  const env = loadEnv(mode, __dirname, "VITE_");
  const automation = !metrics && !uiManageEmbed;

  return {
    resolve: {
      alias: [
        ...createOpenPencilAliases(__dirname),
        // image-size → queue imports Node's `events`. Use the browser polyfill.
        {
          find: /^events$/,
          replacement: resolve(__dirname, "node_modules/events/events.js"),
        },
      ],
    },
    define: {
      __OPENPENCIL_APP_VERSION__: JSON.stringify(packageJson.version),
      ...(uiManageEmbed
        ? { __OPENPENCIL_DONATION_URL__: "null" }
        : donationDefine(__dirname)),
      __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__: JSON.stringify(
        automation ? localAutomationToken(command) : null
      ),
      __OPENPENCIL_LOCAL_AUTOMATION_URL__: JSON.stringify(
        automationRoute.browserURL
      ),
      __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__: JSON.stringify(
        automationRoute.browserURL.replace(/^ws/, "http")
      ),
      "import.meta.env.VITE_OPENPENCIL_UI_MANAGE": JSON.stringify(
        uiManageEmbed ? "1" : ""
      ),
      "import.meta.env.VITE_OPENPENCIL_FEEDBACK": JSON.stringify(
        uiManageEmbed ? "" : env.VITE_OPENPENCIL_FEEDBACK ?? ""
      ),
    },
    // npm CJS leaves under bun `.bun` need force-prebundle; do not prebundle `@open-pencil/*`.
    optimizeDeps: {
      include: [...openPencilForceBundle],
      needsInterop: [...openPencilCjsInterop],
      exclude: [
        "@open-pencil/core",
        "@open-pencil/vue",
        "@open-pencil/scene-graph",
        "@open-pencil/dom-css",
        "@open-pencil/design-jsx",
        "@open-pencil/fig",
        "@open-pencil/pen",
        "@open-pencil/kiwi",
        "@open-pencil/canvaskit",
        // Must not prebundle stock canvaskit-wasm — aliases point at @open-pencil/canvaskit;
        // a stock JS + patched wasm pair throws `*.zd is not a function` and never paints.
        "canvaskit-wasm",
        "canvaskit-wasm/full",
      ],
    },
    plugins: [
      rewriteBunCjsPlugin(),
      rawMarkdownPlugin(),
      inlineScriptPlugin(),
      bootSplashPlugin({
        entry: resolve(__dirname, "src/splash/theme.ts"),
        pages: ["index.html"],
      }),
      tailwindcss(),
      openPencilAssets(),
      Icons({
        compiler: "vue3",
        customCollections: { ai: aiIconCollection() },
      }),
      Components({
        resolvers: [
          IconsResolver({ prefix: "icon", customCollections: ["ai"] }),
        ],
      }),
      automation ? openPencilAutomationPlugin(command, host) : undefined,
      vue(),
      metrics
        ? metricsBrandPlugin((outDir) => resolve(outDir, ".."))
        : openPencilPwaPlugin(),
    ],
    clearScreen: false,
    appType: "spa",
    publicDir: metrics ? false : "public",
    base: metrics ? "/admin/" : "/",
    build: {
      target: viteBuildTarget(),
      chunkSizeWarningLimit: 2500,
      sourcemap:
        !metrics && env.VITE_OPENPENCIL_FEEDBACK === "on" ? "hidden" : false,
      outDir: metrics ? "dist-metrics/admin" : "dist",
      rolldownOptions: {
        // ui-manage / slim App: single SPA entry only
        input: { main: resolve(__dirname, "index.html") },
      },
    },
    server: {
      ...createDevServerOptions(host, __dirname),
      host: true,
      allowedHosts: ["hpghycxjvirg.sealosgzg.site"],
      ...(uiManageEmbed
        ? {
            strictPort: true,
            proxy: {
              "/api": {
                target: "http://127.0.0.1:3001",
                changeOrigin: true,
              },
              "/mcp": {
                target: "http://127.0.0.1:3001",
                changeOrigin: true,
              },
            },
          }
        : {}),
    },
  };
});
