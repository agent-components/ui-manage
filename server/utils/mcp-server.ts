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
import { listMcpToolDescriptors, toolByName, toolMutates } from "./mcp-tools";

export type McpRequestContext = {
  user: AuthUser;
  design: McpDesign;
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
          await tool.loadFonts(figma, args);
          return tool.execute(figma, args);
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
