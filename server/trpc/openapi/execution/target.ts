import { HttpError } from "../../http-error";
import type { AuthUser } from "../../auth/session";
import { prisma } from "../../db";
import { designObjectKey } from "../../storage";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 早期请求头按 Latin-1 入库时，中文会变成与原字节对应的乱码。
 * 能按 UTF-8 往返的才还原。
 */
export function decodeUtf8Header(value: string): string {
  if (/[^\u0000-\u00ff]/.test(value)) return value;
  const decoded = Buffer.from(value, "latin1").toString("utf8");
  if (decoded.includes("\uFFFD")) return value;
  if (Buffer.from(decoded, "utf8").toString("latin1") !== value) return value;
  return decoded;
}

export type McpDesign = {
  id: string;
  name: string;
  ownerAccount: string;
  objectKey: string;
  byteSize: number | null;
};

/** 从工具参数里取出设计稿身份，剩下的才交给画稿工具。 */
export function takeDocParams(args: Record<string, unknown>): {
  docId: string;
  docName: string;
  toolArgs: Record<string, unknown>;
} {
  const docId = typeof args.docId === "string" ? args.docId.trim() : "";
  const docName = typeof args.docName === "string" ? args.docName.trim() : "";
  if (!docId || !docName) {
    throw new HttpError(400, "缺少 docId 或 docName");
  }
  if (!UUID_RE.test(docId)) {
    throw new HttpError(400, "docId 必须是 UUID");
  }
  if (docName.length > 120) {
    throw new HttpError(400, "docName 不能超过 120 个字符");
  }
  const toolArgs = { ...args };
  delete toolArgs.docId;
  delete toolArgs.docName;
  return { docId, docName, toolArgs };
}

/** 按访问令牌账号定位设计稿；不存在则用 docId、docName 创建。 */
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
      throw new HttpError(404, "设计稿不存在");
    }
    const repaired = decodeUtf8Header(existing.name);
    if (repaired !== existing.name) {
      await prisma.design.update({
        where: { id: existing.id },
        data: { name: repaired },
      });
      existing.name = repaired;
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
