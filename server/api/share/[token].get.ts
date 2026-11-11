import { createError, defineEventHandler, getRouterParam } from "h3";
import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token")?.trim();
  if (!token) {
    throw createError({ statusCode: 400, message: "缺少分享 token" });
  }

  const design = await prisma.design.findFirst({
    where: { shareToken: token },
    select: { name: true, updatedAt: true },
  });
  if (!design) {
    throw createError({ statusCode: 404, message: "分享不存在或已关闭" });
  }

  return {
    name: design.name,
    updatedAt: design.updatedAt.toISOString(),
  };
});
