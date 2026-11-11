import {
  createError,
  defineEventHandler,
  getRouterParam,
  send,
  setHeader,
} from "h3";
import { prisma } from "../../../utils/prisma";
import { getDesignObject } from "../../../utils/s3";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token")?.trim();
  if (!token) {
    throw createError({ statusCode: 400, message: "缺少分享 token" });
  }

  const design = await prisma.design.findFirst({
    where: { shareToken: token },
    select: { id: true, objectKey: true },
  });
  if (!design) {
    throw createError({ statusCode: 404, message: "分享不存在或已关闭" });
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
