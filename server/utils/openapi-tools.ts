import { getHeader } from "h3";
import type { H3Event } from "h3";
import type { FigmaAPI } from "@open-pencil/core/figma-api";
import type { ToolDef } from "@open-pencil/core/tools";
import type { AuthUser } from "./auth";
import {
  decodeUtf8Header,
  resolveMcpDesign,
  type McpDesign,
} from "./mcp-design";
import { withMcpDocument } from "./mcp-document";
import { ensureMcpFonts } from "./mcp-fonts";
import {
  isExportPngTool,
  runExportPng,
  exportPngTool,
} from "./mcp-png";
import { DESIGN_ENTITY_TOOLS } from "./design-entity-tools";
import {
  isShareTool,
  MCP_SHARE_TOOLS,
  toolByName,
  toolInputSchema,
  toolMutates,
  mcpTools,
} from "./mcp-tools";
import { ensureShareToken, readShareToken, shareLinkView } from "./share";

/** 这些工具把新图层放在当前页上。没有页面时不能悄悄落到文档根上。 */
const PLACES_ON_PAGE = new Set([
  "create_shape",
  "create_vector",
  "import_svg",
  "insert_icon",
  "render",
  "create_instance",
]);

const DOC_HEADERS = [
  {
    name: "x-doc-id",
    description: "设计稿 ID（UUID）",
    required: true,
    schema: { type: "string", format: "uuid" },
  },
  {
    name: "x-doc-name",
    description: "设计稿名称；稿不存在时用于创建",
    required: true,
    schema: { type: "string" },
  },
] as const;

export type HarnessToolHeader = {
  name: string;
  description?: string;
  required?: boolean;
  schema?: Record<string, unknown>;
};

export type HarnessTool = {
  name: string;
  description?: string;
  method: "POST";
  path: string;
  inputSchema?: Record<string, unknown>;
  headers: HarnessToolHeader[];
};

export function listHarnessTools(): HarnessTool[] {
  const tools: HarnessTool[] = [
    ...DESIGN_ENTITY_TOOLS,
    ...mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      method: "POST" as const,
      path: `/api/openapi/${tool.name}`,
      inputSchema: toolInputSchema(tool),
      headers: [...DOC_HEADERS],
    })),
  ];

  tools.push({
    name: exportPngTool.name,
    description: exportPngTool.description,
    method: "POST",
    path: `/api/openapi/${exportPngTool.name}`,
    inputSchema: exportPngTool.inputSchema,
    headers: [...DOC_HEADERS],
  });

  for (const share of MCP_SHARE_TOOLS) {
    tools.push({
      name: share.name,
      description: share.description,
      method: "POST",
      path: `/api/openapi/${share.name}`,
      inputSchema: { ...share.inputSchema },
      headers: [...DOC_HEADERS],
    });
  }

  return tools;
}

function declaredFonts(
  tool: ToolDef
):
  | ((figma: FigmaAPI, args: Record<string, unknown>) => unknown)
  | null {
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

function createdPageId(result: unknown): string | null {
  if (!result || typeof result !== "object" || !("id" in result)) return null;
  const id = (result as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

function readOpenApiDocHeaders(event: H3Event): {
  docId: string;
  docName: string;
} {
  const docId = getHeader(event, "x-doc-id")?.trim() ?? "";
  const docName = decodeUtf8Header(getHeader(event, "x-doc-name") ?? "").trim();
  return { docId, docName };
}

export { readOpenApiDocHeaders };

export async function resolveDesignForOpenApi(
  user: AuthUser,
  docId: string,
  docName: string
): Promise<McpDesign> {
  return resolveMcpDesign(user, docId, docName);
}

export async function runOpenApiTool(options: {
  name: string;
  args: Record<string, unknown>;
  user: AuthUser;
  design: McpDesign;
  origin: string;
}): Promise<unknown> {
  const { name, args, user, design, origin } = options;

  if (isShareTool(name)) {
    const token =
      name === "create_share_link"
        ? await ensureShareToken(design.id, user.account)
        : await readShareToken(design.id, user.account);
    return shareLinkView(token, origin);
  }

  if (isExportPngTool(name)) {
    return withMcpDocument(design, false, async (figma) => {
      await ensureMcpFonts();
      return runExportPng(figma, args);
    });
  }

  const tool = toolByName(name);
  if (!tool) {
    const error = new Error(`Unknown tool: ${name}`) as Error & {
      statusCode?: number;
    };
    error.statusCode = 404;
    throw error;
  }

  return withMcpDocument(design, toolMutates(tool), async (figma) => {
    await ensureFontsForTool(tool, figma, args);
    if (PLACES_ON_PAGE.has(tool.name) && figma.graph.getPages().length === 0) {
      throw new Error("当前设计稿没有页面，请先调用 create_page");
    }
    await tool.loadFonts(figma, args);
    const result = await tool.execute(figma, args);
    if (tool.name === "create_page") {
      const pageId = createdPageId(result);
      const page = pageId ? figma.getNodeById(pageId) : null;
      if (page) await figma.setCurrentPageAsync(page);
    }
    return result;
  });
}
