import { randomUUID } from "node:crypto";
import { createError } from "h3";
import type { AuthUser } from "./auth";
import { decodeUtf8Header } from "./mcp-design";
import { prisma } from "./prisma";
import { deleteDesignObject, designObjectKey } from "./s3";

type DesignEntityTool = {
  name: string;
  description?: string;
  method: "POST";
  path: string;
  inputSchema?: Record<string, unknown>;
  headers: [];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emptyObjectSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

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
    throw createError({ statusCode: 400, message: "缺少 id" });
  }
  if (!UUID_RE.test(id)) {
    throw createError({ statusCode: 400, message: "id 必须是 UUID" });
  }
  return id;
}

/** 设计文件实体：列表 + 创建 + 重命名 + 删除（无单条详情）。 */
export const DESIGN_ENTITY_TOOLS: DesignEntityTool[] = [
  {
    name: "list_designs",
    description: "列出当前账号下的全部设计文件，按更新时间倒序。",
    method: "POST",
    path: "/api/openapi/list_designs",
    inputSchema: { ...emptyObjectSchema },
    headers: [],
  },
  {
    name: "create_design",
    description: "创建一条空的设计文件，返回新建记录。",
    method: "POST",
    path: "/api/openapi/create_design",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "设计文件名称。省略时为「未命名设计稿」。",
        },
      },
      additionalProperties: false,
    },
    headers: [],
  },
  {
    name: "update_design",
    description: "重命名设计文件。",
    method: "POST",
    path: "/api/openapi/update_design",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          format: "uuid",
          description: "设计文件 ID",
        },
        name: {
          type: "string",
          description: "新名称",
        },
      },
      required: ["id", "name"],
      additionalProperties: false,
    },
    headers: [],
  },
  {
    name: "delete_design",
    description: "删除设计文件及其对象存储内容。",
    method: "POST",
    path: "/api/openapi/delete_design",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          format: "uuid",
          description: "设计文件 ID",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
    headers: [],
  },
];

export function isDesignEntityTool(name: string): boolean {
  return DESIGN_ENTITY_TOOLS.some((tool) => tool.name === name);
}

export async function runDesignEntityTool(
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
        throw createError({
          statusCode: 400,
          message: "名称不能超过 120 个字符",
        });
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
        throw createError({ statusCode: 400, message: "名称不能为空" });
      }
      if (name.length > 120) {
        throw createError({
          statusCode: 400,
          message: "名称不能超过 120 个字符",
        });
      }
      const existing = await prisma.design.findFirst({
        where: { id, ownerAccount: user.account },
      });
      if (!existing) {
        throw createError({ statusCode: 404, message: "设计稿不存在" });
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
        throw createError({ statusCode: 404, message: "设计稿不存在" });
      }
      await prisma.design.delete({ where: { id } });
      await deleteDesignObject(existing.objectKey);
      return { ok: true, id };
    }
    default:
      throw createError({ statusCode: 404, message: "工具不存在" });
  }
}
