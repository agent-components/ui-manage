import { resolve } from "node:path";

/**
 * Published `@open-pencil/*` resolve from npm. Shim only the browser holes that
 * the running editor still imports.
 */
export function createOpenPencilAliases(rootDir: string) {
  const emptyNodeModule = resolve(rootDir, "vite/empty-node-module.ts");
  const shim = (...parts: string[]) => resolve(rootDir, "shims", ...parts);
  const removed = (...parts: string[]) =>
    resolve(rootDir, "shims/removed", ...parts);

  return [
    { find: /^fs$/, replacement: emptyNodeModule },
    { find: /^node:fs$/, replacement: emptyNodeModule },
    {
      find: /^path$/,
      replacement: resolve(rootDir, "vite/empty-node-path.ts"),
    },
    {
      find: /^node:path$/,
      replacement: resolve(rootDir, "vite/empty-node-path.ts"),
    },
    {
      find: /^node:url$/,
      replacement: resolve(rootDir, "vite/empty-node-url.ts"),
    },
    { find: /^url$/, replacement: resolve(rootDir, "vite/empty-node-url.ts") },
    {
      find: /^node:process$/,
      replacement: resolve(rootDir, "vite/node-process.ts"),
    },
    {
      find: /^process$/,
      replacement: resolve(rootDir, "vite/node-process.ts"),
    },
    {
      find: /^source-map-js\/lib\/source-map-generator\.js$/,
      replacement: shim("source-map-generator.ts"),
    },
    {
      find: "source-map-js/lib/source-map-generator.js",
      replacement: shim("source-map-generator.ts"),
    },
    { find: /^@acemir\/cssom$/, replacement: shim("acemir-cssom.ts") },
    { find: "@", replacement: resolve(rootDir, "src") },

    // Core markdown parsing imports these packages; they are not installed.
    {
      find: /^micromark-extension-gfm$/,
      replacement: removed("markdown-empty.ts"),
    },
    {
      find: /^mdast-util-from-markdown$/,
      replacement: removed("markdown-empty.ts"),
    },
    {
      find: /^mdast-util-to-string$/,
      replacement: removed("markdown-empty.ts"),
    },
    {
      find: /^mdast-util-gfm$/,
      replacement: removed("markdown-empty.ts"),
    },
    {
      find: /^vue-stream-markdown\/index\.css$/,
      replacement: removed("vue-stream-markdown.css"),
    },
    {
      find: /^vue-stream-markdown$/,
      replacement: removed("vue-stream-markdown.ts"),
    },
    {
      find: /^@stream-markdown\/code$/,
      replacement: removed("stream-markdown-code.ts"),
    },

    // Published package holes
    {
      find: /^@open-pencil\/vue\/primitives\/Toolbar$/,
      replacement: shim("vue/primitives/Toolbar.ts"),
    },
    {
      find: "@open-pencil/vue/primitives/Toolbar",
      replacement: shim("vue/primitives/Toolbar.ts"),
    },

    // stock canvaskit-wasm → published patched build
    {
      find: /^canvaskit-wasm\/full$/,
      replacement: resolve(
        rootDir,
        "node_modules/@open-pencil/canvaskit/dist/canvaskit.js"
      ),
    },
    {
      find: /^canvaskit-wasm\/bin\/full\/canvaskit\.js$/,
      replacement: resolve(
        rootDir,
        "node_modules/@open-pencil/canvaskit/dist/canvaskit.js"
      ),
    },
    {
      find: /^canvaskit-wasm$/,
      replacement: resolve(
        rootDir,
        "node_modules/@open-pencil/canvaskit/dist/canvaskit.js"
      ),
    },
    {
      find: /^canvaskit-wasm\/bin\/full\/canvaskit\.wasm$/,
      replacement: resolve(
        rootDir,
        "node_modules/@open-pencil/canvaskit/dist/canvaskit.wasm"
      ),
    },
  ];
}
