import {
  createError,
  defineEventHandler,
  getHeader,
  getRouterParam,
  readBody,
  toWebRequest,
} from "h3";
import { requireUser } from "../../utils/auth";
import {
  isDesignEntityTool,
  runDesignEntityTool,
} from "../../utils/design-entity-tools";
import {
  readOpenApiDocHeaders,
  resolveDesignForOpenApi,
  runOpenApiTool,
} from "../../utils/openapi-tools";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requestOrigin(event: Parameters<typeof getHeader>[0]): string {
  const forwardedHost = getHeader(event, "x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = getHeader(event, "x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost) {
    return `${forwardedProto || "http"}://${forwardedHost}`;
  }
  return new URL(toWebRequest(event).url).origin;
}

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, "name")?.trim() ?? "";
  if (!name) {
    throw createError({ statusCode: 404, message: "工具不存在" });
  }

  const user = await requireUser(event);
  const body = (await readBody(event).catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const args =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};

  try {
    if (isDesignEntityTool(name)) {
      return await runDesignEntityTool(name, args, user);
    }

    const { docId, docName } = readOpenApiDocHeaders(event);
    if (!docId || !docName) {
      throw createError({
        statusCode: 400,
        message: "缺少 x-doc-id 或 x-doc-name",
      });
    }
    if (!UUID_RE.test(docId)) {
      throw createError({
        statusCode: 400,
        message: "x-doc-id 必须是 UUID",
      });
    }

    const design = await resolveDesignForOpenApi(user, docId, docName);
    return await runOpenApiTool({
      name,
      args,
      user,
      design,
      origin: requestOrigin(event),
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "工具执行失败";
    if (message.startsWith("Unknown tool:")) {
      throw createError({ statusCode: 404, message: "工具不存在" });
    }
    throw createError({ statusCode: 400, message });
  }
});
