import { createError, defineEventHandler, getRouterParam } from "h3";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const token = await prisma.apiToken.findFirst({
    where: { id, ownerAccount: user.account, revokedAt: null },
    select: { id: true },
  });
  if (!token) {
    throw createError({ statusCode: 404, message: "令牌不存在或已撤销" });
  }

  await prisma.apiToken.update({
    where: { id: token.id },
    data: { revokedAt: new Date() },
  });

  return { ok: true };
});
