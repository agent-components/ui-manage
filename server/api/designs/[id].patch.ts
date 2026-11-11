import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

type PatchBody = {
  name?: string;
};

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const body = await readBody<PatchBody>(event);
  const name = body.name?.trim();
  if (!name) {
    throw createError({ statusCode: 400, message: "名称不能为空" });
  }

  const existing = await prisma.design.findFirst({
    where: { id, ownerAccount: user.account },
  });
  if (!existing) {
    throw createError({ statusCode: 404, message: "设计稿不存在" });
  }

  return prisma.design.update({
    where: { id },
    data: { name },
  });
});
