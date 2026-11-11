import {
  createError,
  defineEventHandler,
  getRouterParam,
  send,
  setHeader,
} from "h3";
import { requireUser } from "../../../utils/auth";
import { prisma } from "../../../utils/prisma";
import { getDesignObject } from "../../../utils/s3";

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

  try {
    const bytes = await getDesignObject(design.objectKey);
    setHeader(event, "content-type", "application/octet-stream");
    setHeader(
      event,
      "content-disposition",
      `attachment; filename="${design.id}.fig"`
    );
    return send(event, Buffer.from(bytes));
  } catch (error: unknown) {
    // 新建稿尚未首次保存：返回空内容，前端据此打开空白画布
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
    if (statusCode === 404) {
      setHeader(event, "content-type", "application/octet-stream");
      return send(event, Buffer.alloc(0));
    }
    throw error;
  }
});
