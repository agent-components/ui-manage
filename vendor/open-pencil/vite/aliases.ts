import { resolve } from "node:path";

/**
 * Published `@open-pencil/*` resolve from npm. Only shim tarball holes, unpublished
 * collab, and harness stubs (not installed).
 */
function cloudOffAliases(rootDir: string) {
  return [
    {
      find: /^@\/app\/cloud\/integration$/,
      replacement: resolve(rootDir, "src/app/cloud/integration/off/index.ts"),
    },
    {
      find: /^@\/app\/cloud\/integration\/storage$/,
      replacement: resolve(rootDir, "src/app/cloud/integration/off/storage.ts"),
    },
    {
      find: /^@\/components\/cloud\/integration$/,
      replacement: resolve(rootDir, "src/components/cloud/integration/off.ts"),
    },
  ];
}

export function createOpenPencilAliases(
  rootDir: string,
  options: { cloud?: boolean } = {}
) {
  const emptyNodeModule = resolve(rootDir, "vite/empty-node-module.ts");
  const shim = (...parts: string[]) => resolve(rootDir, "shims", ...parts);
  const removed = (...parts: string[]) =>
    resolve(rootDir, "shims/removed", ...parts);
  const app = (...parts: string[]) => resolve(rootDir, "src/app", ...parts);

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
    ...(options.cloud === false ? cloudOffAliases(rootDir) : []),
    { find: "@", replacement: resolve(rootDir, "src") },

    // harness → local stub (package not installed); feedback removed
    { find: /^@open-pencil\/harness$/, replacement: app("harness.ts") },
    { find: "@open-pencil/harness", replacement: app("harness.ts") },
    {
      find: /^@open-pencil\/feedback(\/.*)?$/,
      replacement: removed("empty.ts"),
    },

    // Removed npm packages → shims (cloud/mcp/mermaid/ai/tauri not in runtime)
    {
      find: /^@open-pencil\/cloud\/client$/,
      replacement: removed("cloud/client.ts"),
    },
    {
      find: /^@open-pencil\/cloud\/contract$/,
      replacement: removed("cloud/contract.ts"),
    },
    // `@open-pencil/mermaid` may still exist as a transitive of core; do not stub it —
    // App paste path is disabled instead (see paste/content.ts).
    {
      find: /^@open-pencil\/mcp\/tools$/,
      replacement: removed("mcp/tools.ts"),
    },
    {
      find: /^@open-pencil\/mcp\/transport$/,
      replacement: removed("mcp/transport.ts"),
    },
    {
      find: /^@open-pencil\/mcp\/discovery$/,
      replacement: removed("mcp/discovery.ts"),
    },
    { find: /^ai$/, replacement: removed("ai.ts") },
    {
      find: /^@ai-sdk\/anthropic$/,
      replacement: removed("ai-sdk/anthropic.ts"),
    },
    {
      find: /^@ai-sdk\/deepseek$/,
      replacement: removed("ai-sdk/deepseek.ts"),
    },
    {
      find: /^@ai-sdk\/google$/,
      replacement: removed("ai-sdk/google.ts"),
    },
    {
      find: /^@ai-sdk\/openai$/,
      replacement: removed("ai-sdk/openai.ts"),
    },
    {
      find: /^@ai-sdk\/valibot$/,
      replacement: removed("ai-sdk/valibot.ts"),
    },
    {
      find: /^@ai-sdk\/vue$/,
      replacement: removed("ai-sdk/vue.ts"),
    },
    {
      find: /^@tauri-apps\/api\/core$/,
      replacement: removed("tauri/api-core.ts"),
    },
    {
      find: /^@tauri-apps\/api\/event$/,
      replacement: removed("tauri/api-event.ts"),
    },
    {
      find: /^@tauri-apps\/api\/path$/,
      replacement: removed("tauri/api-path.ts"),
    },
    {
      find: /^@tauri-apps\/api\/window$/,
      replacement: removed("tauri/api-window.ts"),
    },
    {
      find: /^@tauri-apps\/api\/webviewWindow$/,
      replacement: removed("tauri/api-webviewWindow.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-clipboard-manager$/,
      replacement: removed("tauri/plugin-clipboard.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-dialog$/,
      replacement: removed("tauri/plugin-dialog.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-fs$/,
      replacement: removed("tauri/plugin-fs.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-notification$/,
      replacement: removed("tauri/plugin-notification.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-os$/,
      replacement: removed("tauri/plugin-os.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-process$/,
      replacement: removed("tauri/plugin-process.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-shell$/,
      replacement: removed("tauri/plugin-shell.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-updater$/,
      replacement: removed("tauri/plugin-updater.ts"),
    },
    {
      find: /^@tauri-apps\/plugin-opener$/,
      replacement: removed("tauri/plugin-opener.ts"),
    },
    {
      find: /^@posthog\/core\/error-tracking$/,
      replacement: removed("posthog-error-tracking.ts"),
    },
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
      find: /^@agentclientprotocol\/sdk$/,
      replacement: removed("acp-sdk.ts"),
    },
    {
      find: /^@smithy\/fetch-http-handler$/,
      replacement: removed("smithy-fetch.ts"),
    },
    {
      find: /^@openrouter\/ai-sdk-provider$/,
      replacement: removed("openrouter.ts"),
    },
    {
      find: /^partial-json$/,
      replacement: removed("partial-json.ts"),
    },
    {
      find: /^vue-stream-markdown\/index\.css$/,
      replacement: removed("vue-stream-markdown/index.css"),
    },
    {
      find: /^vue-stream-markdown$/,
      replacement: removed("vue-stream-markdown/index.ts"),
    },
    {
      find: /^@stream-markdown\/code$/,
      replacement: removed("stream-markdown-code.ts"),
    },
    {
      find: /^@aws-sdk\/client-s3$/,
      replacement: removed("aws-s3.ts"),
    },
    {
      find: /^qrcode$/,
      replacement: removed("qrcode.ts"),
    },
    {
      find: /^webmcp-types$/,
      replacement: removed("webmcp-types.ts"),
    },

    // Published package holes
    {
      find: /^@open-pencil\/vue\/lifecycle\/overlays$/,
      replacement: shim("vue/lifecycle/overlays/index.ts"),
    },
    {
      find: "@open-pencil/vue/lifecycle/overlays",
      replacement: shim("vue/lifecycle/overlays"),
    },
    {
      find: /^@open-pencil\/vue\/shared\/frame$/,
      replacement: shim("vue/shared/frame.ts"),
    },
    {
      find: /^@open-pencil\/vue\/primitives\/Toolbar$/,
      replacement: shim("vue/primitives/Toolbar.ts"),
    },
    {
      find: "@open-pencil/vue/primitives/Toolbar",
      replacement: shim("vue/primitives/Toolbar.ts"),
    },
    {
      find: /^@open-pencil\/vue\/editor\/keyboard$/,
      replacement: shim("vue/editor/keyboard/index.ts"),
    },
    {
      find: "@open-pencil/vue/editor/keyboard",
      replacement: shim("vue/editor/keyboard"),
    },
    {
      find: /^@open-pencil\/scene-graph\/constraints$/,
      replacement: shim("scene-graph/constraints.ts"),
    },

    // Multiplayer collab disabled — stub package
    {
      find: /^@open-pencil\/collab$/,
      replacement: resolve(rootDir, "src/shims/removed/collab.ts"),
    },
    {
      find: "@open-pencil/collab",
      replacement: resolve(rootDir, "src/shims/removed"),
    },
    { find: "#collab", replacement: resolve(rootDir, "src/shims/removed/collab.ts") },

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
