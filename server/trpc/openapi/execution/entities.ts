import { randomUUID } from "node:crypto";
import { HttpError } from "../../http-error";
import type { AuthUser } from "../../auth/session";
import { prisma } from "../../db";
import { deleteDesignObject, designObjectKey } from "../../storage";
import { decodeUtf8Header } from "./target";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function designView(design: {
  id: string;
  name: string;
  ownerAccount: string;
  byteSize: number | null;
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: design.id,
    name: design.name,
    ownerAccount: design.ownerAccount,
    byteSize: design.byteSize,
    shareToken: design.shareToken,
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  };
}

function requireId(args: Record<string, unknown>): string {
  const id = typeof args.id === "string" ? args.id.trim() : "";
  if (!id) {
    throw new HttpError(400, "缺少 id");
  }
  if (!UUID_RE.test(id)) {
    throw new HttpError(400, "id 必须是 UUID");
  }
  return id;
}

/** 设计文件实体：列表 + 创建 + 重命名 + 删除（无单条详情）。 */
export async function runDesignTool(
  name: string,
  args: Record<string, unknown>,
  user: AuthUser
): Promise<unknown> {
  switch (name) {
    case "list_designs": {
      const designs = await prisma.design.findMany({
        where: { ownerAccount: user.account },
        orderBy: { updatedAt: "desc" },
      });
      for (const design of designs) {
        const fixed = decodeUtf8Header(design.name);
        if (fixed === design.name) continue;
        await prisma.design.update({
          where: { id: design.id },
          data: { name: fixed },
        });
        design.name = fixed;
      }
      return designs.map(designView);
    }
    case "create_design": {
      const name =
        typeof args.name === "string" && args.name.trim()
          ? args.name.trim()
          : "未命名设计稿";
      if (name.length > 120) {
        throw new HttpError(400, "名称不能超过 120 个字符");
      }
      const id = randomUUID();
      const design = await prisma.design.create({
        data: {
          id,
          name,
          ownerAccount: user.account,
          objectKey: designObjectKey(user.account, id),
          byteSize: null,
        },
      });
      return designView(design);
    }
    case "update_design": {
      const id = requireId(args);
      const name = typeof args.name === "string" ? args.name.trim() : "";
      if (!name) {
        throw new HttpError(400, "名称不能为空");
      }
      if (name.length > 120) {
        throw new HttpError(400, "名称不能超过 120 个字符");
      }
      const existing = await prisma.design.findFirst({
        where: { id, ownerAccount: user.account },
      });
      if (!existing) {
        throw new HttpError(404, "设计稿不存在");
      }
      const design = await prisma.design.update({
        where: { id },
        data: { name },
      });
      return designView(design);
    }
    case "delete_design": {
      const id = requireId(args);
      const existing = await prisma.design.findFirst({
        where: { id, ownerAccount: user.account },
      });
      if (!existing) {
        throw new HttpError(404, "设计稿不存在");
      }
      await prisma.design.delete({ where: { id } });
      await deleteDesignObject(existing.objectKey);
      return { ok: true, id };
    }
    default:
      throw new HttpError(404, "工具不存在");
  }
}
