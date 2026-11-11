import { randomUUID } from "node:crypto";
import { defineEventHandler, readBody } from "h3";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";
import { designObjectKey } from "../../utils/s3";

type CreateBody = {
  name?: string;
};

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<CreateBody>(event);
  const name = body.name?.trim() || "未命名设计稿";
  const id = randomUUID();
  const objectKey = designObjectKey(user.account, id);

  return prisma.design.create({
    data: {
      id,
      name,
      ownerAccount: user.account,
      objectKey,
      byteSize: null,
    },
  });
});
