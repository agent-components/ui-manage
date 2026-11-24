import { requireUser, type AuthUser } from "../auth/session";
import { isPngTool, listHarnessTools } from "./definitions";
import { runTool } from "./execution";
import { exportPngToolResponse } from "./execution/png";

const PROTOCOL_VERSION = "2025-03-26";

/** 仅当启动时设置了 MCP_ENABLE=1（或 true / yes / on）才挂载 /mcp。 */
export function mcpEnabled(): boolean {
  const value = process.env.MCP_ENABLE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

type RpcId = string | number | null;

type RpcMessage = {
  jsonrpc?: unknown;
  id?: RpcId;
  method?: unknown;
  params?: unknown;
};

function rpcResult(id: RpcId, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function rpcError(id: RpcId, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function protocolTools() {
  return listHarnessTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

function toolContent(name: string, result: unknown) {
  if (isPngTool(name)) {
    const body = exportPngToolResponse(
      result as Parameters<typeof exportPngToolResponse>[0]
    );
    const failed = !!result && typeof result === "object" && "error" in result;
    return failed ? { ...body, isError: true } : body;
  }
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result ?? null, null, 2),
      },
    ],
  };
}

async function callTool(
  user: AuthUser,
  name: string,
  args: Record<string, unknown>,
  origin: string
): Promise<unknown> {
  return runTool(name, args, { user, origin });
}

async function handleMethod(
  message: RpcMessage,
  user: AuthUser,
  origin: string
): Promise<unknown | undefined> {
  const method = typeof message.method === "string" ? message.method : "";
  const hasId = Object.prototype.hasOwnProperty.call(message, "id");
  const id: RpcId = hasId ? message.id ?? null : null;

  if (!method) {
    return hasId ? rpcError(id, -32600, "Invalid Request") : undefined;
  }

  if (
    method === "notifications/initialized" ||
    method === "notifications/cancelled"
  ) {
    return undefined;
  }

  if (!hasId) return undefined;

  if (method === "initialize") {
    const params = isRecord(message.params) ? message.params : {};
    const requested =
      typeof params.protocolVersion === "string" && params.protocolVersion
        ? params.protocolVersion
        : PROTOCOL_VERSION;
    return rpcResult(id, {
      protocolVersion: requested,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "设计稿", version: "1.0.0" },
      instructions:
        "画稿工具的参数里要带 docId（UUID）和 docName。稿不存在时按这两个参数创建。列表、创建、重命名、删除设计文件不需要这两个参数。没有当前页：读某一页传 page_id，新建图层传 parent_id。",
    });
  }

  if (method === "ping") {
    return rpcResult(id, {});
  }

  if (method === "tools/list") {
    return rpcResult(id, { tools: protocolTools() });
  }

  if (method === "tools/call") {
    const params = isRecord(message.params) ? message.params : null;
    const name = params && typeof params.name === "string" ? params.name : "";
    if (!name) return rpcError(id, -32602, "缺少工具名");
    const args = isRecord(params?.arguments) ? params.arguments : {};
    try {
      const result = await callTool(user, name, args, origin);
      return rpcResult(id, toolContent(name, result));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "工具执行失败";
      if (message.startsWith("Unknown tool:")) {
        return rpcResult(id, {
          content: [{ type: "text", text: "工具不存在" }],
          isError: true,
        });
      }
      return rpcResult(id, {
        content: [{ type: "text", text: message }],
        isError: true,
      });
    }
  }

  return rpcError(id, -32601, `方法不存在: ${method}`);
}

export async function handleMcp(
  request: Request,
  origin: string
): Promise<Response> {
  if (!mcpEnabled()) {
    return Response.json(
      { error: true, statusCode: 404, message: "MCP 未启用" },
      { status: 404 }
    );
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: true, statusCode: 405, message: "方法不允许" },
      { status: 405, headers: { allow: "POST" } }
    );
  }

  const user = await requireUser(request.headers.get("authorization"));
  const raw = await request.text();
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"), {
      status: 400,
    });
  }

  if (Array.isArray(parsed)) {
    const responses = [];
    for (const item of parsed) {
      if (!isRecord(item)) {
        responses.push(rpcError(null, -32600, "Invalid Request"));
        continue;
      }
      const response = await handleMethod(item, user, origin);
      if (response !== undefined) responses.push(response);
    }
    if (responses.length === 0) return new Response(null, { status: 202 });
    return Response.json(responses);
  }

  if (!isRecord(parsed)) {
    return Response.json(rpcError(null, -32600, "Invalid Request"), {
      status: 400,
    });
  }

  const response = await handleMethod(parsed, user, origin);
  if (response === undefined) return new Response(null, { status: 202 });
  return Response.json(response);
}
