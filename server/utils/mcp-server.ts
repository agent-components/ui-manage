import { AsyncLocalStorage } from "node:async_hooks";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { AuthUser } from "./auth";
import type { McpDesign } from "./mcp-design";
import { withMcpDocument } from "./mcp-document";
import {
  exportPngToolResponse,
  isExportPngTool,
  runExportPng,
} from "./mcp-png";
import {
  isShareTool,
  listMcpToolDescriptors,
  toolByName,
  toolMutates,
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

function createdPageId(result: unknown): string | null {
  if (!result || typeof result !== "object" || !("id" in result)) return null;
  const id = (result as { id: unknown }).id;
  return typeof id === "string" ? id : null;
}

export type McpRequestContext = {
  user: AuthUser;
  design: McpDesign;
  origin: string;
};

export const mcpContext = new AsyncLocalStorage<McpRequestContext>();

function requireContext(): McpRequestContext {
  const ctx = mcpContext.getStore();
  if (!ctx) throw new Error("MCP context missing");
  return ctx;
}

function createServer(): McpServer {
  const server = new McpServer(
    { name: "ui-manage", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listMcpToolDescriptors(),
  }));

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (isShareTool(request.params.name)) {
      const { user, design, origin } = requireContext();
      try {
        const token =
          request.params.name === "create_share_link"
            ? await ensureShareToken(design.id, user.account)
            : await readShareToken(design.id, user.account);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(shareLinkView(token, origin), null, 2),
            },
          ],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text" as const, text: message }],
        };
      }
    }

    if (isExportPngTool(request.params.name)) {
      const { design } = requireContext();
      const args = (request.params.arguments ?? {}) as Record<string, unknown>;
      try {
        const result = await withMcpDocument(design, false, (figma) =>
          runExportPng(figma, args)
        );
        return exportPngToolResponse(result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{ type: "text" as const, text: message }],
        };
      }
    }

    const tool = toolByName(request.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Unknown tool: ${request.params.name}`,
          },
        ],
      };
    }

    const { design } = requireContext();
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    try {
      const result = await withMcpDocument(
        design,
        toolMutates(tool),
        async (figma) => {
          if (
            PLACES_ON_PAGE.has(tool.name) &&
            figma.graph.getPages().length === 0
          ) {
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
        }
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: "text" as const, text: message }],
      };
    }
  });

  return server;
}

/** 每个 HTTP 请求建一次无状态 Streamable HTTP 会话。 */
export async function handleMcpHttpRequest(
  request: Request,
  ctx: McpRequestContext
): Promise<Response> {
  return mcpContext.run(ctx, async () => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createServer();
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await server.close().catch(() => undefined);
    }
  });
}
