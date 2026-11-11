import { createError, defineEventHandler, getRouterParam } from "h3";
import { requireUser } from "../../../utils/auth";
import { prisma } from "../../../utils/prisma";
import { sharePayload } from "../../../utils/share";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const design = await prisma.design.findFirst({
    where: { id, ownerAccount: user.account },
    select: { shareToken: true },
  });
  if (!design) {
    throw createError({ statusCode: 404, message: "设计稿不存在" });
  }

  return sharePayload(design.shareToken);
});
