import { createHead } from "@unhead/vue/client";
import { createApp, nextTick } from "vue";

import { ReadOnlyDocumentError } from "@open-pencil/core";
import { createRetainedScopePlugin } from "@open-pencil/vue/lifecycle/retention";

import "./app.css";
import { preloadCanvasKit } from "@/app/editor/canvas/canvaskit";
import { preloadFonts } from "@/app/editor/fonts";
import { registerInterfaceFont } from "@/app/editor/fonts/interface";
import { observeBootErrors } from "@/app/shell/support/boot";
import { reportBootFailure } from "@/app/shell/support/gate";

import App from "./App.vue";
import router from "./router";

/**
 * Application entry, loaded by `main.ts` only after the support gate passes.
 * Keeping it behind a dynamic import means an unsupported engine never
 * evaluates the app bundle and can still show the gate's guidance.
 */
export async function boot(): Promise<void> {
  registerInterfaceFont();
  preloadCanvasKit();
  preloadFonts();
  const head = createHead();
  const app = createApp(App);
  const bootErrors = observeBootErrors(app);
  app.use(router).use(head).use(createRetainedScopePlugin()).mount("#app");

  await router.isReady();
  await nextTick();
  const failure = bootErrors.stop();
  if (failure) {
    await reportBootFailure(failure.error);
    return;
  }
  app.config.errorHandler = (error, _instance, _info) => {
    // A panel's edit to a read-only document does nothing, as in Figma.
    if (error instanceof ReadOnlyDocumentError) return;
    console.error(error);
  };

  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
    return undefined;
  });
}
