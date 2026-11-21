import { HttpError } from "../http-error";
import { prisma } from "../db";
import { getDesignObject } from "../storage";

function statusCodeOf(error: unknown): number {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return 0;
  return Number((error as { statusCode?: number }).statusCode);
}

export async function readSharedContent(
  token: string
): Promise<{ id: string; bytes: Uint8Array }> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new HttpError(400, "缺少分享 token");
  }

  const design = await prisma.design.findFirst({
    where: { shareToken: trimmed },
    select: { id: true, objectKey: true },
  });
  if (!design) {
    throw new HttpError(404, "分享不存在或已关闭");
  }

  try {
    const bytes = await getDesignObject(design.objectKey);
    return { id: design.id, bytes };
  } catch (error: unknown) {
    if (statusCodeOf(error) === 404) {
      return { id: design.id, bytes: new Uint8Array() };
    }
    throw error;
  }
}
