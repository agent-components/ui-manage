import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { listLibraryObjects } from "./objects";
import { protectedProcedure, router } from "../trpc";

export const librariesRouter = router({
  list: protectedProcedure
    .input(z.object({ prefix: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!input.prefix) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "缺少 prefix" });
      }
      const objects = await listLibraryObjects(ctx.user.account, input.prefix);
      return { objects };
    }),
});
