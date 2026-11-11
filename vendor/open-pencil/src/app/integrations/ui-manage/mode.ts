import { isUiManageSharePreview } from "./share-bridge";

/** Built with OPENPENCIL_UI_MANAGE / VITE_OPENPENCIL_UI_MANAGE=1. */
export const isUiManageEmbed =
  import.meta.env.VITE_OPENPENCIL_UI_MANAGE === "1";

export { isUiManageSharePreview };

/** Leave the single-design editor and return to the designs list (no empty Home tab). */
export function leaveUiManageEditor(): void {
  if (!isUiManageEmbed) return;
  void import("@/router").then((mod) => {
    const router = mod.default;
    if (router.currentRoute.value.name === "ui-manage-designs") return;
    void router.replace({ name: "ui-manage-designs" });
  });
}
