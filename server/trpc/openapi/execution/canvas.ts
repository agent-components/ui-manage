import type { FigmaAPI } from "@open-pencil/core/figma-api";
import type { ToolDef } from "@open-pencil/core/tools";
import { withMcpDocument } from "./document";
import { ensureMcpFonts } from "./fonts";
import { prepareScope, scopeResult } from "./scope";
import type { McpDesign } from "./target";
import { toolByName, toolMutates } from "../tools";

/** 这些工具会新建图层。没有页面时不能悄悄落到文档根上。 */
const PLACES_ON_PAGE = new Set([
  "create_shape",
  "create_vector",
  "import_svg",
  "insert_icon",
  "render",
  "create_instance",
]);

function declaredFonts(
  tool: ToolDef
): ((figma: FigmaAPI, args: Record<string, unknown>) => unknown) | null {
  const fonts = (tool as { fonts?: unknown }).fonts;
  return typeof fonts === "function"
    ? (fonts as (figma: FigmaAPI, args: Record<string, unknown>) => unknown)
    : null;
}

function payloadHasText(
  toolName: string,
  args: Record<string, unknown>
): boolean {
  if (toolName === "render" && typeof args.jsx === "string") {
    return /<\s*(Text|Span|Paragraph|text-span|text-paragraph|text)\b/.test(
      args.jsx
    );
  }
  if (toolName === "import_svg" && typeof args.svg === "string") {
    return /<\s*text\b/i.test(args.svg);
  }
  return false;
}

async function ensureFontsForTool(
  tool: ToolDef,
  figma: FigmaAPI,
  args: Record<string, unknown>
): Promise<void> {
  if (payloadHasText(tool.name, args)) {
    await ensureMcpFonts();
    return;
  }
  const fonts = declaredFonts(tool);
  if (!fonts) return;
  let requested: unknown;
  try {
    requested = fonts(figma, args);
  } catch {
    return;
  }
  if (Array.isArray(requested) && requested.length > 0) {
    await ensureMcpFonts();
  }
}

/** 执行一个画布工具。名字不在编辑器名单里就当作未知工具。 */
export async function runCanvasTool(
  name: string,
  design: McpDesign,
  args: Record<string, unknown>
): Promise<unknown> {
  const tool = toolByName(name);
  if (!tool) {
    const error = new Error(`Unknown tool: ${name}`) as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }

  return withMcpDocument(design, toolMutates(tool), async (figma) => {
    if (PLACES_ON_PAGE.has(tool.name) && figma.graph.getPages().length === 0) {
      throw new Error("当前设计稿没有页面，请先调用 create_page");
    }
    const prepared = await prepareScope(figma, tool.name, args);
    await ensureFontsForTool(tool, figma, prepared.args);
    await tool.loadFonts(figma, prepared.args);
    const result = await tool.execute(figma, prepared.args);
    if (prepared.after) await prepared.after(result);
    return scopeResult(tool.name, result);
  });
}
