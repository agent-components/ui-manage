import {
  createError,
  defineEventHandler,
  getQuery,
  getRequestURL,
  getRouterParam,
} from "h3";
import { requireUser } from "../../../utils/auth";
import { buildMcpConfigString } from "../../../utils/mcp-config";
import { prisma } from "../../../utils/prisma";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const row = await prisma.apiToken.findFirst({
    where: { id, ownerAccount: user.account, revokedAt: null },
    select: { id: true, name: true, token: true },
  });
  if (!row || !row.token) {
    throw createError({
      statusCode: 404,
      message: "令牌不存在，或创建于明文落库之前，请重新创建",
    });
  }

  const query = getQuery(event);
  const originParam =
    typeof query.origin === "string" ? query.origin.trim() : "";
  let origin = originParam.replace(/\/$/, "");
  if (!origin) {
    const url = getRequestURL(event);
    origin = `${url.protocol}//${url.host}`;
  }

  return {
    config: buildMcpConfigString({
      name: row.name,
      token: row.token,
      mcpUrl: `${origin}/mcp`,
    }),
  };
});
