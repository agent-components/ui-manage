import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  authenticateUser,
  clearUserToken,
  exchangeHarnessSso,
  issueUserToken,
  readUserToken,
  updateUserProfile,
} from "./session";
import { protectedProcedure, publicProcedure, router } from "../trpc";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyToNull(
  value: string | null | undefined,
  max: number,
  label: string
): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (text.length > max) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${label}不能超过 ${max} 个字符`,
    });
  }
  return text;
}

const profileInput = z.object({
  displayName: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ account: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const account = input.account.trim();
      const password = input.password;
      if (!account || !password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请输入账号和密码",
        });
      }

      const user = await authenticateUser(account, password);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "账号或密码错误",
        });
      }

      const token = await issueUserToken(user.account);
      return { token, user };
    }),

  sso: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      const code = input.code.trim();
      if (!code) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请从 Harness Admin 打开",
        });
      }
      const { token, user } = await exchangeHarnessSso(code);
      return {
        token,
        user: {
          id: user.id,
          account: user.account,
          displayName: user.displayName,
          role: user.role,
        },
      };
    }),

  me: protectedProcedure.query(({ ctx }) => ctx.user),

  token: protectedProcedure.query(async ({ ctx }) => {
    const token = await readUserToken(ctx.user.account);
    if (!token) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "当前用户没有令牌",
      });
    }
    return { token };
  }),

  updateProfile: protectedProcedure
    .input(profileInput)
    .mutation(async ({ ctx, input }) => {
      const displayName = input.displayName.trim();
      if (!displayName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "显示名称不能为空",
        });
      }
      if (displayName.length > 64) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "显示名称不能超过 64 个字符",
        });
      }

      const email = emptyToNull(input.email, 120, "邮箱");
      if (email && !EMAIL.test(email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "邮箱格式不正确",
        });
      }

      const phone = emptyToNull(input.phone, 32, "手机");
      const currentPassword = input.currentPassword ?? "";
      const newPassword = input.newPassword ?? "";
      if (currentPassword || newPassword) {
        if (!currentPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "请输入当前密码",
          });
        }
        if (!newPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "请输入新密码",
          });
        }
        if (newPassword.length < 6 || newPassword.length > 72) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "新密码长度需为 6 到 72 个字符",
          });
        }
      }

      return updateUserProfile(ctx.user.account, {
        displayName,
        email,
        phone,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword || undefined,
      });
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (ctx.token) await clearUserToken(ctx.token);
    return { ok: true as const };
  }),
});
