import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decodeUtf8Header } from "../openapi/execution/target";
import { prisma } from "../db";
import { designObjectKey, deleteDesignObject } from "../storage";
import {
  ensureShareToken,
  readShareToken,
  sharePayload,
} from "../share/links";
import { protectedProcedure, router } from "../trpc";

const idInput = z.object({ id: z.string() });

function requireId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "缺少 id" });
  }
  return trimmed;
}

function toDesign(design: {
  id: string;
  name: string;
  ownerAccount: string;
  objectKey: string;
  byteSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: design.id,
    name: design.name,
    ownerAccount: design.ownerAccount,
    objectKey: design.objectKey,
    byteSize: design.byteSize,
    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  };
}

export const designsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const designs = await prisma.design.findMany({
      where: { ownerAccount: ctx.user.account },
      orderBy: { updatedAt: "desc" },
    });
    for (const design of designs) {
      const name = decodeUtf8Header(design.name);
      if (name === design.name) continue;
      await prisma.design.update({
        where: { id: design.id },
        data: { name },
      });
      design.name = name;
    }
    return designs.map(toDesign);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const name = input.name?.trim() || "未命名设计稿";
      const id = randomUUID();
      const objectKey = designObjectKey(ctx.user.account, id);
      const design = await prisma.design.create({
        data: {
          id,
          name,
          ownerAccount: ctx.user.account,
          objectKey,
          byteSize: null,
        },
      });
      return toDesign(design);
    }),

  get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
    const id = requireId(input.id);
    const design = await prisma.design.findFirst({
      where: { id, ownerAccount: ctx.user.account },
    });
    if (!design) {
      throw new TRPCError({ code: "NOT_FOUND", message: "设计稿不存在" });
    }
    return toDesign(design);
  }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const id = requireId(input.id);
      const name = input.name.trim();
      if (!name) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "名称不能为空" });
      }
      const existing = await prisma.design.findFirst({
        where: { id, ownerAccount: ctx.user.account },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "设计稿不存在" });
      }
      const design = await prisma.design.update({
        where: { id },
        data: { name },
      });
      return toDesign(design);
    }),

  delete: protectedProcedure
    .input(idInput)
    .mutation(async ({ ctx, input }) => {
      const id = requireId(input.id);
      const existing = await prisma.design.findFirst({
        where: { id, ownerAccount: ctx.user.account },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "设计稿不存在" });
      }
      await prisma.design.delete({ where: { id } });
      await deleteDesignObject(existing.objectKey);
      return { ok: true as const };
    }),

  share: router({
    get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
      const shareToken = await readShareToken(
        requireId(input.id),
        ctx.user.account
      );
      return sharePayload(shareToken);
    }),
    enable: protectedProcedure
      .input(idInput)
      .mutation(async ({ ctx, input }) => {
        const shareToken = await ensureShareToken(
          requireId(input.id),
          ctx.user.account
        );
        return sharePayload(shareToken);
      }),
    disable: protectedProcedure
      .input(idInput)
      .mutation(async ({ ctx, input }) => {
        const id = requireId(input.id);
        const design = await prisma.design.findFirst({
          where: { id, ownerAccount: ctx.user.account },
          select: { id: true },
        });
        if (!design) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "设计稿不存在",
          });
        }
        await prisma.design.update({
          where: { id: design.id },
          data: { shareToken: null },
        });
        return sharePayload(null);
      }),
  }),
});
