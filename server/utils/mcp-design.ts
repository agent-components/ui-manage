import { createError, getHeader } from "h3";
import type { H3Event } from "h3";
import type { AuthUser } from "./auth";
import { prisma } from "./prisma";
import { designObjectKey } from "./s3";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type McpDesign = {
  id: string;
  name: string;
  ownerAccount: string;
  objectKey: string;
  byteSize: number | null;
};

export function readDocHeaders(event: H3Event): {
  docId: string;
  docName: string;
} {
  const docId = getHeader(event, "x-doc-id")?.trim() ?? "";
  const docName = getHeader(event, "x-doc-name")?.trim() ?? "";
  if (!docId || !docName) {
    throw createError({
      statusCode: 400,
      message: "缺少 x-doc-id 或 x-doc-name",
    });
  }
  if (!UUID_RE.test(docId)) {
    throw createError({
      statusCode: 400,
      message: "x-doc-id 必须是 UUID",
    });
  }
  return { docId, docName };
}

/** 按访问令牌账号定位设计稿；不存在则用请求头创建。 */
export async function resolveMcpDesign(
  user: AuthUser,
  docId: string,
  docName: string
): Promise<McpDesign> {
  const existing = await prisma.design.findUnique({
    where: { id: docId },
    select: {
      id: true,
      name: true,
      ownerAccount: true,
      objectKey: true,
      byteSize: true,
    },
  });

  if (existing) {
    if (existing.ownerAccount !== user.account) {
      throw createError({ statusCode: 404, message: "设计稿不存在" });
    }
    return existing;
  }

  return prisma.design.create({
    data: {
      id: docId,
      name: docName,
      ownerAccount: user.account,
      objectKey: designObjectKey(user.account, docId),
      byteSize: null,
    },
    select: {
      id: true,
      name: true,
      ownerAccount: true,
      objectKey: true,
      byteSize: true,
    },
  });
}
