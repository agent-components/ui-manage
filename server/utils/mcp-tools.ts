import { ALL_TOOLS, toolChangesDocument } from "@open-pencil/core/tools";
import type { ToolDef } from "@open-pencil/core/tools";
import { toJsonSchema } from "@valibot/to-json-schema";

/** 方案确认的 49 个画稿工具。 */
export const MCP_TOOL_NAMES = [
  // 读取
  "get_page_tree",
  "get_node",
  "find_nodes",
  "get_jsx",
  "describe",
  "list_pages",
  "get_current_page",
  "switch_page",
  "node_children",
  "node_tree",
  "node_ancestors",
  "node_bounds",
  "page_bounds",
  // 创建
  "create_shape",
  "render",
  "create_page",
  "create_vector",
  "import_svg",
  "create_component",
  "create_instance",
  "node_to_component",
  "search_icons",
  "insert_icon",
  // 修改
  "update_node",
  "batch_update",
  "set_fill",
  "set_image_fill",
  "set_stroke",
  "set_effects",
  "set_layout",
  "set_layout_child",
  "set_radius",
  "set_opacity",
  "set_rotation",
  "set_visible",
  "set_constraints",
  "set_minmax",
  "set_text",
  "set_text_properties",
  "set_font",
  "node_resize",
  "node_move",
  // 结构
  "delete_node",
  "clone_node",
  "rename_node",
  "reparent_node",
  "group_nodes",
  "ungroup_node",
  // 导出
  "export_svg",
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

const nameSet = new Set<string>(MCP_TOOL_NAMES);

export const mcpTools: ToolDef[] = ALL_TOOLS.filter((tool) =>
  nameSet.has(tool.name)
);

if (mcpTools.length !== MCP_TOOL_NAMES.length) {
  const found = new Set(mcpTools.map((t) => t.name));
  const missing = MCP_TOOL_NAMES.filter((name) => !found.has(name));
  throw new Error(`MCP tools missing from ALL_TOOLS: ${missing.join(", ")}`);
}

export function toolByName(name: string): ToolDef | undefined {
  return mcpTools.find((tool) => tool.name === name);
}

export function toolMutates(tool: ToolDef): boolean {
  return toolChangesDocument(tool);
}

export function toolInputSchema(tool: ToolDef): Record<string, unknown> {
  const schema = toJsonSchema(tool.input, {
    errorMode: "ignore",
    typeMode: "force",
  }) as Record<string, unknown>;
  return {
    type: "object",
    ...schema,
  };
}

export function listMcpToolDescriptors() {
  return mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toolInputSchema(tool),
  }));
}
