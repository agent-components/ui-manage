import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { requireUser } from "./trpc/auth/session";
import { createContext } from "./trpc/context";
import { readDesignContent, writeDesignContent } from "./trpc/designs/content";
import { isHttpError } from "./trpc/http-error";
import {
  readLibraryObject,
  writeLibraryObject,
} from "./trpc/libraries/objects";
import {
  isDesignEntityTool,
  runDesignEntityTool,
} from "./trpc/openapi/entities";
import {
  resolveDesignForOpenApi,
  runOpenApiTool,
} from "./trpc/openapi/catalog";
import { takeDocParams } from "./trpc/openapi/design";
import { handleMcp, mcpEnabled } from "./trpc/openapi/mcp";
import { appRouter } from "./trpc/router";
import { readSharedContent } from "./trpc/share/content";

const ALLOW = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
]);

const HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function errorJson(status: number, message: string): Response {
  return Response.json(
    { error: true, statusCode: status, message },
    { status }
  );
}

function fromError(error: unknown): Response {
  if (isHttpError(error)) return errorJson(error.statusCode, error.message);
  if (error && typeof error === "object" && "statusCode" in error) {
    const status = Number((error as { statusCode?: number }).statusCode);
    const message = error instanceof Error ? error.message : "请求失败";
    if (status >= 400 && status < 600) return errorJson(status, message);
  }
  console.error(error);
  return errorJson(500, "服务器错误");
}

function corsHeaders(origin: string): Headers {
  const headers = new Headers();
  if (!ALLOW.has(origin)) return headers;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, If-Match, If-None-Match"
  );
  headers.set("Access-Control-Expose-Headers", "ETag");
  headers.set("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  return headers;
}

function applyCors(response: Response, origin: string): Response {
  const extra = corsHeaders(origin);
  if (!extra.has("Access-Control-Allow-Origin")) return response;
  const headers = new Headers(response.headers);
  extra.forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return new Uint8Array(Buffer.concat(chunks));
}

function toRequest(req: IncomingMessage, body: Uint8Array): Request {
  const host = req.headers.host ?? "127.0.0.1";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null || HOP_HEADERS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD" || body.byteLength === 0) {
    return new Request(url, { method, headers });
  }
  return new Request(url, {
    method,
    headers,
    body: new Blob([Buffer.from(body)]),
  });
}

function requestOrigin(url: URL, headers: Headers): string {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost) return `${forwardedProto || "http"}://${forwardedHost}`;
  return url.origin;
}

function bytesResponse(
  bytes: Uint8Array,
  filename?: string,
  extra?: Headers
): Response {
  const headers = extra ?? new Headers();
  headers.set("content-type", "application/octet-stream");
  if (filename) {
    headers.set("content-disposition", `attachment; filename="${filename}"`);
  }
  return new Response(Buffer.from(bytes), { headers });
}

async function handleApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (pathname === "/mcp") {
    return handleMcp(request, requestOrigin(url, request.headers));
  }

  if (pathname === "/api/trpc" || pathname.startsWith("/api/trpc/")) {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: request,
      router: appRouter,
      createContext: () => createContext(request),
    });
  }

  if (pathname === "/api/harness/menus" && method === "GET") {
    const caller = appRouter.createCaller(await createContext(request));
    return Response.json(await caller.harness.menus());
  }

  if (pathname === "/api/harness/tools" && method === "GET") {
    const caller = appRouter.createCaller(await createContext(request));
    return Response.json(await caller.harness.tools());
  }

  const designContent = pathname.match(/^\/api\/designs\/([^/]+)\/content$/);
  if (designContent) {
    const id = decodeURIComponent(designContent[1] ?? "");
    const user = await requireUser(request.headers.get("authorization"));
    if (method === "GET" || method === "HEAD") {
      const file = await readDesignContent(user.account, id);
      return bytesResponse(file.bytes, `${file.id}.fig`);
    }
    if (method === "PUT") {
      const bytes = new Uint8Array(await request.arrayBuffer());
      return Response.json(await writeDesignContent(user.account, id, bytes));
    }
    return errorJson(405, "方法不允许");
  }

  const shareContent = pathname.match(/^\/api\/share\/([^/]+)\/content$/);
  if (shareContent && (method === "GET" || method === "HEAD")) {
    const token = decodeURIComponent(shareContent[1] ?? "");
    const file = await readSharedContent(token);
    return bytesResponse(file.bytes, `${file.id}.fig`);
  }

  if (pathname === "/api/libraries/objects/content") {
    const user = await requireUser(request.headers.get("authorization"));
    const key = url.searchParams.get("key") ?? "";
    if (!key) return errorJson(400, "缺少 key");
    if (method === "GET" || method === "HEAD") {
      const object = await readLibraryObject(user.account, key);
      if (!object) return errorJson(404, "组件库对象不存在");
      const headers = new Headers();
      if (object.etag) headers.set("etag", object.etag);
      return bytesResponse(object.bytes, undefined, headers);
    }
    if (method === "PUT") {
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.byteLength === 0) return errorJson(400, "缺少组件库内容");
      await writeLibraryObject(
        user.account,
        key,
        bytes,
        request.headers.get("content-type") || "application/json",
        {
          ifMatch: request.headers.get("if-match") || undefined,
          ifNoneMatch: request.headers.get("if-none-match") || undefined,
        }
      );
      return Response.json({ ok: true });
    }
    return errorJson(405, "方法不允许");
  }

  const openapi = pathname.match(/^\/api\/openapi\/([^/]+)$/);
  if (openapi) {
    if (method !== "POST") return errorJson(405, "方法不允许");
    const name = decodeURIComponent(openapi[1] ?? "").trim();
    if (!name) return errorJson(404, "工具不存在");
    const user = await requireUser(request.headers.get("authorization"));
    let args: Record<string, unknown> = {};
    const raw = await request.text();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        args = {};
      }
    }
    try {
      if (isDesignEntityTool(name)) {
        return Response.json(await runDesignEntityTool(name, args, user));
      }
      const { docId, docName, toolArgs } = takeDocParams(args);
      const design = await resolveDesignForOpenApi(user, docId, docName);
      return Response.json(
        await runOpenApiTool({
          name,
          args: toolArgs,
          user,
          design,
          origin: requestOrigin(url, request.headers),
        })
      );
    } catch (error: unknown) {
      if (
        isHttpError(error) ||
        (error && typeof error === "object" && "statusCode" in error)
      ) {
        return fromError(error);
      }
      const message = error instanceof Error ? error.message : "工具执行失败";
      if (message.startsWith("Unknown tool:")) {
        return errorJson(404, "工具不存在");
      }
      return errorJson(400, message);
    }
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return errorJson(404, "Not Found");
  }
  return null;
}

function findPublicDir(): string | undefined {
  const candidates = [
    resolve(process.cwd(), "public"),
    resolve(process.cwd(), "vendor/open-pencil/dist"),
    resolve(process.cwd(), ".output/public"),
  ];
  for (const dir of candidates) {
    if (existsSync(resolve(dir, "index.html"))) return dir;
  }
  return undefined;
}

function hasFileExtension(pathname: string): boolean {
  const base = pathname.slice(pathname.lastIndexOf("/") + 1);
  return base.includes(".");
}

function resolvePublicFile(root: string, pathname: string): string | null {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rootResolved = resolve(root);
  const target = resolve(rootResolved, `.${decoded}`);
  if (target !== rootResolved && !target.startsWith(`${rootResolved}${sep}`)) {
    return null;
  }
  return target;
}

function staticResponse(pathname: string): Response {
  const root = findPublicDir();
  if (!root) {
    return errorJson(
      404,
      "找不到前端 index.html。开发请用 pnpm dev（Vite :5173）；发布请先 pnpm pack。"
    );
  }

  if (hasFileExtension(pathname)) {
    const file = resolvePublicFile(root, pathname);
    if (!file || !existsSync(file) || !statSync(file).isFile()) {
      return errorJson(404, "Not Found");
    }
    const type =
      CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
    const headers = new Headers({ "content-type": type });
    if (pathname.startsWith("/assets/")) {
      headers.set("cache-control", "public, max-age=31536000, immutable");
    }
    return new Response(readFileSync(file), { headers });
  }

  const index = resolve(root, "index.html");
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache",
  });
  return new Response(readFileSync(index), { headers });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const origin =
    typeof req.headers.origin === "string" ? req.headers.origin : "";
  if (req.method === "OPTIONS" && ALLOW.has(origin)) {
    const headers = corsHeaders(origin);
    res.statusCode = 204;
    headers.forEach((value, key) => res.setHeader(key, value));
    res.end();
    return;
  }

  try {
    const method = req.method ?? "GET";
    const body =
      method === "GET" || method === "HEAD"
        ? new Uint8Array()
        : await readBody(req);
    const request = toRequest(req, body);
    const api = await handleApi(request);
    const response = applyCors(
      api ?? staticResponse(new URL(request.url).pathname),
      origin
    );
    await writeResponse(res, response, method === "HEAD");
  } catch (error) {
    const response = applyCors(fromError(error), origin);
    await writeResponse(res, response, false);
  }
}

async function writeResponse(
  res: ServerResponse,
  response: Response,
  head: boolean
) {
  res.statusCode = response.status;
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
  if (head || response.body == null) {
    res.end();
    return;
  }
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function startServer() {
  const host = process.env.HOST?.trim() || "0.0.0.0";
  const port = Number(process.env.PORT || 3001);
  const server = createServer((req, res) => {
    void handle(req, res);
  });
  server.listen(port, host, () => {
    console.log(`Listening on http://${host}:${port}`);
    if (mcpEnabled()) console.log(`MCP enabled at http://${host}:${port}/mcp`);
  });
}
