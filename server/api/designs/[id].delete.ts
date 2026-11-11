import { createError, defineEventHandler, getRouterParam } from "h3";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";
import { deleteDesignObject } from "../../utils/s3";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const existing = await prisma.design.findFirst({
    where: { id, ownerAccount: user.account },
  });
  if (!existing) {
    throw createError({ statusCode: 404, message: "设计稿不存在" });
  }

  await prisma.design.delete({ where: { id } });
  await deleteDesignObject(existing.objectKey);
  return { ok: true };
});
