import { defineEventHandler } from "h3";
import { requireUser } from "../../utils/auth";
import { decodeUtf8Header } from "../../utils/mcp-design";
import { prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const designs = await prisma.design.findMany({
    where: { ownerAccount: user.account },
    orderBy: { updatedAt: "desc" },
  });
  for (const design of designs) {
    const name = decodeUtf8Header(design.name);
    if (name === design.name) continue;
    await prisma.design.update({
      where: { id: design.id },
      data: { name },
    });
    design.name = name;
  }
  return designs;
});
