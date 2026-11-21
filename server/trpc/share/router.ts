import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "../db";
import { publicProcedure, router } from "../trpc";

export const shareRouter = router({
  meta: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const token = input.token.trim();
      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "缺少分享 token",
        });
      }

      const design = await prisma.design.findFirst({
        where: { shareToken: token },
        select: { name: true, updatedAt: true },
      });
      if (!design) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "分享不存在或已关闭",
        });
      }

      return {
        name: design.name,
        updatedAt: design.updatedAt.toISOString(),
      };
    }),
});
