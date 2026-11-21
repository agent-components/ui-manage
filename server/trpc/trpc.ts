import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { isHttpError } from "./http-error";

const t = initTRPC.context<Context>().create();

function codeFor(status: number): TRPCError["code"] {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 412) return "PRECONDITION_FAILED";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status >= 400 && status < 500) return "BAD_REQUEST";
  return "INTERNAL_SERVER_ERROR";
}

/** 业务层抛 HttpError 时改写成 tRPC 错误，并保留原文。 */
const mapHttpErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) return result;
  const cause = result.error.cause;
  if (!isHttpError(cause)) return result;
  throw new TRPCError({
    code: codeFor(cause.statusCode),
    message: cause.message || "请求失败",
    cause,
  });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(mapHttpErrors);
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ctx.token ? "登录已失效" : "未登录",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
