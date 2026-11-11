// Points Core at the CanvasKit binary, bundled fonts, and HarfBuzz subsetter Vite serves;
// importing the module is what sets them, before anything loads.
import "@open-pencil/core/runtime-assets/install";
import { getCanvasKit, setCanvasKitLocator } from "@open-pencil/core/canvaskit";

/**
 * ui-manage: always load the wasm that matches `@open-pencil/canvaskit` (aliased over
 * `canvaskit-wasm`). Mixing stock JS with a different wasm leaves the canvas stuck at
 * 300×150 — layers update but nothing paints.
 */
import canvasKitWasmUrl from "@open-pencil/canvaskit/dist/canvaskit.wasm?url";

setCanvasKitLocator((file) =>
  file.endsWith(".wasm") ? canvasKitWasmUrl : `/${file}`
);

/**
 * Starts loading CanvasKit as the app starts, so a document the app opens with does not wait for
 * the binary after its own download; the canvas shares this load. A failed one is retried there.
 */
export function preloadCanvasKit(): void {
  getCanvasKit().catch((error) => {
    console.error("[CanvasKit] preload failed", error);
  });
}
