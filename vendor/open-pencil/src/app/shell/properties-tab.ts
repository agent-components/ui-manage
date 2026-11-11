import { ref } from "vue";

/** Properties panel tabs (AI chat panel removed in ui-manage). */
export type PropertiesTab = "design" | "code" | "lint";

export const propertiesTab = ref<PropertiesTab>("design");
