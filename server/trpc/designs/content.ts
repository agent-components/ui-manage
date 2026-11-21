import { HttpError } from "../http-error";
import { prisma } from "../db";
import { getDesignObject, putDesignObject } from "../storage";

function statusCodeOf(error: unknown): number {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return 0;
  return Number((error as { statusCode?: number }).statusCode);
}

async function ownedDesign(account: string, id: string) {
  if (!id) {
    throw new HttpError(400, "缺少 id");
  }
  const design = await prisma.design.findFirst({
    where: { id, ownerAccount: account },
  });
  if (!design) {
    throw new HttpError(404, "设计稿不存在");
  }
  return design;
}

/** 尚未保存过的新稿按空内容返回，前端据此打开空白画布。 */
export async function readDesignContent(
  account: string,
  id: string
): Promise<{ id: string; bytes: Uint8Array }> {
  const design = await ownedDesign(account, id);
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

export async function writeDesignContent(
  account: string,
  id: string,
  bytes: Uint8Array
) {
  const design = await ownedDesign(account, id);
  if (bytes.byteLength === 0) {
    throw new HttpError(400, "缺少设计稿内容");
  }
  await putDesignObject(design.objectKey, bytes);
  return prisma.design.update({
    where: { id: design.id },
    data: { byteSize: bytes.byteLength },
  });
}
