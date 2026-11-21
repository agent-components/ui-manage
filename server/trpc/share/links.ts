import { HttpError } from "../http-error";
import { randomBytes } from "node:crypto";
import { prisma } from "../db";

export function createShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function sharePath(token: string): string {
  return `/share/${encodeURIComponent(token)}`;
}

export function sharePayload(shareToken: string | null) {
  return {
    enabled: Boolean(shareToken),
    shareToken,
    url: shareToken ? sharePath(shareToken) : null,
  };
}

/** 给 MCP 的绝对地址。path 与 HTTP 接口的 url 字段相同。 */
export function shareLinkView(shareToken: string | null, origin: string) {
  const payload = sharePayload(shareToken);
  return {
    enabled: payload.enabled,
    path: payload.url,
    url: payload.url ? `${origin.replace(/\/$/, "")}${payload.url}` : null,
  };
}

async function ownedDesign(designId: string, ownerAccount: string) {
  const design = await prisma.design.findFirst({
    where: { id: designId, ownerAccount },
    select: { id: true, shareToken: true },
  });
  if (!design) {
    throw new HttpError(404, "设计稿不存在");
  }
  return design;
}

export async function readShareToken(
  designId: string,
  ownerAccount: string
): Promise<string | null> {
  const design = await ownedDesign(designId, ownerAccount);
  return design.shareToken;
}

/**
 * 一篇设计稿只有一条分享链接。已有则直接返回；并发创建时后到的请求读回先写入的那条。
 */
export async function ensureShareToken(
  designId: string,
  ownerAccount: string
): Promise<string> {
  const design = await ownedDesign(designId, ownerAccount);
  if (design.shareToken) return design.shareToken;

  const shareToken = createShareToken();
  const updated = await prisma.design.updateMany({
    where: { id: design.id, ownerAccount, shareToken: null },
    data: { shareToken },
  });
  if (updated.count === 1) return shareToken;

  const current = await ownedDesign(design.id, ownerAccount);
  if (current.shareToken) return current.shareToken;
  throw new HttpError(409, "创建分享链接失败");
}
