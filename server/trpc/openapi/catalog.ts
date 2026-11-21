import type { FigmaAPI } from "@open-pencil/core/figma-api";
import type { ToolDef } from "@open-pencil/core/tools";
import type { AuthUser } from "../auth/session";
import { resolveMcpDesign, withDocParams, type McpDesign } from "./design";
import { withMcpDocument } from "./document";
import { ensureMcpFonts } from "./fonts";
import { isExportPngTool, runExportPng, exportPngTool } from "./png";
import { DESIGN_ENTITY_TOOLS } from "./entities";
import {
  isShareTool,
  MCP_SHARE_TOOLS,
  toolByName,
  toolInputSchema,
  toolMutates,
  mcpTools,
} from "./tools";
import {
  ensureShareToken,
  readShareToken,
  shareLinkView,
} from "../share/links";
import {
  prepareScope,
  scopeDescription,
  scopeInputSchema,
  scopeResult,
} from "./scope";

/** 这些工具会新建图层。没有页面时不能悄悄落到文档根上。 */
const PLACES_ON_PAGE = new Set([
  "create_shape",
  "create_vector",
  "import_svg",
  "insert_icon",
  "render",
  "create_instance",
]);

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
    ...mcpTools.map((tool) =>
      documentTool(tool.name, tool.description, toolInputSchema(tool))
    ),
  ];

  tools.push(
    documentTool(
      exportPngTool.name,
      exportPngTool.description,
      exportPngTool.inputSchema
    )
  );

  for (const share of MCP_SHARE_TOOLS) {
    tools.push(
      documentTool(share.name, share.description, { ...share.inputSchema })
    );
  }

  return tools;
}

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

function documentTool(
  name: string,
  description: string | undefined,
  inputSchema: Record<string, unknown>
): HarnessTool {
  return {
    name,
    description: scopeDescription(name, description),
    method: "POST",
    path: `/api/openapi/${name}`,
    inputSchema: withDocParams(scopeInputSchema(name, inputSchema)),
    headers: [],
  };
}

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
      const prepared = await prepareScope(figma, name, args);
      await ensureMcpFonts();
      return runExportPng(figma, prepared.args);
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
