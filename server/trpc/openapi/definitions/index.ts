import { MCP_TOOL_NAMES } from "../tools";
import toolsJson from "./tools.json";

/** 对外工具的定义：名字、说明、参数。执行逻辑在 ../execution 里。 */
export type ToolDefinition = {
  name: string;
  description: string;
  /** 参数的 JSON Schema，外部据此构造调用参数。 */
  inputSchema: Record<string, unknown>;
};

/**
 * 对外工具的全部定义，名称、说明、参数都在 tools.json 里。
 * 画布工具的参数已固化，运行时不再从编辑器取；编辑器改了参数不会自动同步，需要手动更新 tools.json。
 */
export const TOOL_DEFINITIONS = toolsJson as ToolDefinition[];

/** 设计文件工具：走本地数据库，不吃设计稿身份。 */
const DESIGN_TOOL_NAMES = new Set([
  "list_designs",
  "create_design",
  "update_design",
  "delete_design",
]);
/** 分享链接工具：吃设计稿身份。 */
const SHARE_TOOL_NAMES = new Set(["create_share_link", "get_share_link"]);
/** PNG 导出工具：吃设计稿身份。 */
const PNG_TOOL_NAMES = new Set(["export_png"]);

export function isDesignTool(name: string): boolean {
  return DESIGN_TOOL_NAMES.has(name);
}

export function isShareTool(name: string): boolean {
  return SHARE_TOOL_NAMES.has(name);
}

export function isPngTool(name: string): boolean {
  return PNG_TOOL_NAMES.has(name);
}

export type HarnessTool = {
  name: string;
  description: string;
  method: "POST";
  path: string;
  inputSchema: Record<string, unknown>;
  headers: unknown[];
};

/** 给外部看的工具清单，/api/harness/tools 和 MCP tools/list 都用它。 */
export function listHarnessTools(): HarnessTool[] {
  return TOOL_DEFINITIONS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    method: "POST",
    path: `/api/openapi/${tool.name}`,
    inputSchema: tool.inputSchema,
    headers: [],
  }));
}

// 启动时检查，对不上直接报错。
const specialNames = [...DESIGN_TOOL_NAMES, ...SHARE_TOOL_NAMES, ...PNG_TOOL_NAMES];
const allNames = TOOL_DEFINITIONS.map((tool) => tool.name);
const unknownSpecial = specialNames.filter((name) => !allNames.includes(name));
if (unknownSpecial.length > 0) {
  throw new Error(`工具清单里没有这些名字：${unknownSpecial.join("、")}`);
}
const canvasNames = allNames.filter((name) => !specialNames.includes(name));
const editorNames: string[] = [...MCP_TOOL_NAMES];
const missing = editorNames.filter((name) => !canvasNames.includes(name));
const extra = canvasNames.filter((name) => !editorNames.includes(name));
if (missing.length > 0 || extra.length > 0) {
  throw new Error(
    `对外工具清单和编辑器对不上：` +
      `清单缺少 ${missing.join("、") || "无"}；` +
      `清单多出 ${extra.join("、") || "无"}`
  );
}
