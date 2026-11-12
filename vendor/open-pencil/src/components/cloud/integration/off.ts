import { defineComponent } from "vue";

/** Official Cloud UI is not part of this app. These components render nothing. */
function absent(name: string) {
  return defineComponent({ name, inheritAttrs: false, render: () => null });
}

export const CloudSharedSection = absent("CloudSharedSection");
export const CloudWorkspaceSection = absent("CloudWorkspaceSection");
export const CloudSettingsSection = absent("CloudSettingsSection");
export const CloudHosts = absent("CloudHosts");
export const CloudShareButton = absent("CloudShareButton");
export const CloudDocumentStatusHost = absent("CloudDocumentStatusHost");
export const CloudVersionDialog = absent("CloudVersionDialog");
export const CloudVersionHistory = absent("CloudVersionHistory");
