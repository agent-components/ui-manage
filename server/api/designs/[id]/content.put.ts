import {
  createError,
  defineEventHandler,
  getRouterParam,
  readRawBody,
} from "h3";
import { requireUser } from "../../../utils/auth";
import { prisma } from "../../../utils/prisma";
import { putDesignObject } from "../../../utils/s3";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const design = await prisma.design.findFirst({
    where: { id, ownerAccount: user.account },
  });
  if (!design) {
    throw createError({ statusCode: 404, message: "设计稿不存在" });
  }

  let raw = await readRawBody(event, false);
  if (!raw || raw.length === 0) {
    const chunks: Buffer[] = [];
    for await (const chunk of event.node.req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    raw = chunks.length ? Buffer.concat(chunks) : null;
  }

  if (!raw || raw.length === 0) {
    throw createError({ statusCode: 400, message: "缺少设计稿内容" });
  }

  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  await putDesignObject(design.objectKey, bytes);
  return prisma.design.update({
    where: { id },
    data: { byteSize: bytes.byteLength },
  });
});
