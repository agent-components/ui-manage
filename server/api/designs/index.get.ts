import { defineEventHandler } from "h3";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return prisma.design.findMany({
    where: { ownerAccount: user.account },
    orderBy: { updatedAt: "desc" },
  });
});
