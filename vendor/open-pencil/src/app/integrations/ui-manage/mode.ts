import { isUiManageSharePreview } from "./share-bridge";
import { isEmbeddedFrame } from "./session";

/**
 * 本仓库产物恒为 ui-manage 组件，不再用构建环境变量区分。
 * 是否被宿主以 iframe 嵌入由 isEmbeddedFrame() 在运行时判断。
 */
export const isUiManageEmbed = true;

export { isEmbeddedFrame, isUiManageSharePreview };

/** Leave the single-design editor and return to the designs list (no empty Home tab). */
export function leaveUiManageEditor(): void {
  void import("@/router").then((mod) => {
    const router = mod.default;
    if (router.currentRoute.value.name === "ui-manage-designs") return;
    void router.replace({ name: "ui-manage-designs" });
  });
}
