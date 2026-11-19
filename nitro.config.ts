import { cpSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineNitroConfig } from "nitropack/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const editorDist = join(rootDir, "vendor/open-pencil/dist");
const outputPublic = join(rootDir, ".output/public");
/** 打包时强制带上；开发时若已有前端产物也挂上，避免只起 API 时 /assets 404。 */
const includeEditorDist =
  process.env.NITRO_PUBLIC_DIST === "1" ||
  existsSync(join(editorDist, "index.html")) ||
  existsSync(join(outputPublic, "index.html"));
const publicDir = existsSync(join(editorDist, "index.html"))
  ? editorDist
  : outputPublic;

const require = createRequire(fileURLToPath(new URL("./package.json", import.meta.url)));
const coreRequire = createRequire(require.resolve("@open-pencil/core/package.json"));

/**
 * 这些文件按路径读取，node-file-trace 跟不到。
 * 字体给改字和 PNG；wasm 给 CanvasKit 渲染和 HarfBuzz 排版。
 */
const RUNTIME_FILES = [
  "@open-pencil/core/assets/InterVariable.ttf",
  "@open-pencil/core/assets/Inter-SemiBold.ttf",
  "canvaskit-wasm/bin/full/canvaskit.wasm",
  "harfbuzzjs/dist/harfbuzz-subset.wasm",
];

function packageRelative(absPath: string): string {
  const marker = "/node_modules/";
  const index = absPath.lastIndexOf(marker);
  if (index < 0) {
    throw new Error(`运行时文件不在 node_modules 里：${absPath}`);
  }
  return absPath.slice(index + marker.length);
}

function copyRuntimeFiles(serverDir: string) {
  const serverModules = join(serverDir, "node_modules");
  for (const specifier of RUNTIME_FILES) {
    const src = coreRequire.resolve(specifier);
    const dst = join(serverModules, packageRelative(src));
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(src, dst);
  }
}

export default defineNitroConfig({
  compatibilityDate: "2025-07-15",
  srcDir: "server",
  preset: "node-server",
  publicAssets: includeEditorDist
    ? [{ dir: publicDir, baseURL: "/" }]
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
  hooks: {
    compiled(nitro) {
      copyRuntimeFiles(nitro.options.output.serverDir);
    },
  },
});
