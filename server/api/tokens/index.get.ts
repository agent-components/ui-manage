import { defineEventHandler } from "h3";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const tokens = await prisma.apiToken.findMany({
    where: { ownerAccount: user.account, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
  return tokens;
});
