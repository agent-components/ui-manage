import { randomBytes } from "node:crypto";
import { createError, getHeader } from "h3";
import type { H3Event } from "h3";
import { hashApiToken, isApiTokenFormat } from "./api-token";
import { prisma } from "./prisma";

export type AuthUser = {
  id: string;
  account: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  aboutMe: string | null;
};

export type ProfileUpdate = {
  displayName: string;
  email: string | null;
  phone: string | null;
  aboutMe: string | null;
  currentPassword?: string;
  newPassword?: string;
};

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isUserToken(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

type UserRow = {
  id: string;
  account: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  aboutMe: string | null;
};

function toAuthUser(row: UserRow | undefined): AuthUser | null {
  if (!row?.account) return null;
  const displayName = row.displayName?.trim();
  return {
    id: row.id,
    account: row.account,
    displayName: displayName || row.account,
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    aboutMe: row.aboutMe?.trim() || null,
  };
}

/** 登录名是 public.users.account。停用账号不能登录。密码比对与现网一致（明文等值）。 */
export async function authenticateUser(
  account: string,
  password: string
): Promise<AuthUser | null> {
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, account, "displayName", email, phone, "aboutMe"
    FROM public.users
    WHERE account = ${account}
      AND password = ${password}
      AND status = 'ACTIVE'
    LIMIT 1
  `;
  return toAuthUser(rows[0]);
}

/** 未过期则复用 public.users.token，否则签发新 token。 */
export async function issueUserToken(account: string): Promise<string> {
  const existing = await prisma.$queryRaw<{ token: string }[]>`
    SELECT token
    FROM public.users
    WHERE account = ${account}
      AND status = 'ACTIVE'
      AND token IS NOT NULL
      AND "tokenExpiredAt" > now()
    LIMIT 1
  `;
  const current = existing[0]?.token;
  if (current && isUserToken(current)) return current;

  const token = randomBytes(32).toString("hex");
  const expiredAt = new Date(Date.now() + TOKEN_TTL_MS);
  const updated = await prisma.$executeRaw`
    UPDATE public.users
    SET token = ${token},
        "tokenExpiredAt" = ${expiredAt},
        "updatedAt" = now()
    WHERE account = ${account} AND status = 'ACTIVE'
  `;
  if (!updated) {
    throw createError({ statusCode: 500, message: "无法写入登录 token" });
  }
  return token;
}

export async function findUserByToken(token: string): Promise<AuthUser | null> {
  if (!isUserToken(token)) return null;
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, account, "displayName", email, phone, "aboutMe"
    FROM public.users
    WHERE token = ${token}
      AND status = 'ACTIVE'
      AND "tokenExpiredAt" > now()
    LIMIT 1
  `;
  return toAuthUser(rows[0]);
}

/** MCP 访问令牌：按哈希匹配未撤销记录，并更新 last_used_at。 */
export async function findUserByApiToken(
  token: string
): Promise<AuthUser | null> {
  if (!isApiTokenFormat(token)) return null;
  const tokenHash = hashApiToken(token);
  const apiToken = await prisma.apiToken.findFirst({
    where: { tokenHash, revokedAt: null },
    select: { id: true, ownerAccount: true },
  });
  if (!apiToken) return null;

  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, account, "displayName", email, phone, "aboutMe"
    FROM public.users
    WHERE account = ${apiToken.ownerAccount}
      AND status = 'ACTIVE'
    LIMIT 1
  `;
  const user = toAuthUser(rows[0]);
  if (!user) return null;

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });
  return user;
}

export async function requireApiTokenUser(event: H3Event): Promise<AuthUser> {
  const token = extractBearerToken(event);
  if (!token) {
    throw createError({ statusCode: 401, message: "未提供访问令牌" });
  }
  const user = await findUserByApiToken(token);
  if (!user) {
    throw createError({ statusCode: 401, message: "访问令牌无效或已撤销" });
  }
  return user;
}

export async function clearUserToken(token: string): Promise<void> {
  if (!isUserToken(token)) return;
  await prisma.$executeRaw`
    UPDATE public.users
    SET token = NULL,
        "tokenExpiredAt" = NULL,
        "updatedAt" = now()
    WHERE token = ${token}
  `;
}

export function extractBearerToken(event: H3Event): string | null {
  const auth = getHeader(event, "authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match?.[1]?.trim() || null;
}

/** 更新显示名、邮箱、手机、简介；传入 newPassword 时先核对当前密码。 */
export async function updateUserProfile(
  account: string,
  patch: ProfileUpdate
): Promise<AuthUser> {
  if (patch.newPassword) {
    const current = await prisma.$queryRaw<{ password: string }[]>`
      SELECT password
      FROM public.users
      WHERE account = ${account} AND status = 'ACTIVE'
      LIMIT 1
    `;
    if (!current[0] || current[0].password !== patch.currentPassword) {
      throw createError({ statusCode: 400, message: "当前密码不正确" });
    }
  }

  const rows = await prisma.$queryRaw<UserRow[]>`
    UPDATE public.users
    SET "displayName" = ${patch.displayName},
        email = ${patch.email},
        phone = ${patch.phone},
        "aboutMe" = ${patch.aboutMe},
        "updatedAt" = now()
    WHERE account = ${account} AND status = 'ACTIVE'
    RETURNING id, account, "displayName", email, phone, "aboutMe"
  `;
  const user = toAuthUser(rows[0]);
  if (!user) {
    throw createError({ statusCode: 404, message: "账号不存在或已停用" });
  }

  if (patch.newPassword) {
    await prisma.$executeRaw`
      UPDATE public.users
      SET password = ${patch.newPassword},
          "updatedAt" = now()
      WHERE account = ${account} AND status = 'ACTIVE'
    `;
  }

  return user;
}

export async function requireUser(event: H3Event): Promise<AuthUser> {
  const token = extractBearerToken(event);
  if (!token) {
    throw createError({ statusCode: 401, message: "未登录" });
  }
  const user = await findUserByToken(token);
  if (!user) {
    throw createError({ statusCode: 401, message: "登录已失效" });
  }
  return user;
}
