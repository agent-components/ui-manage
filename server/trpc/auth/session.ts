import { HttpError } from "../http-error";
import { randomBytes } from "node:crypto";
import type { User, UserRole } from "@ui-manage/prisma";
import { prisma } from "../db";

export type AuthUser = {
  id: string;
  account: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
};

export type ProfileUpdate = {
  displayName: string;
  email: string | null;
  phone: string | null;
  currentPassword?: string;
  newPassword?: string;
};

const LOGIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SSO_TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
export const SSO_DEFAULT_PASSWORD = "123456";

function isUserToken(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function toAuthUser(row: User | null | undefined): AuthUser | null {
  if (!row?.account) return null;
  const displayName = row.displayName?.trim();
  return {
    id: row.id,
    account: row.account,
    displayName: displayName || row.account,
    email: row.email?.trim() || null,
    phone: row.phone?.trim() || null,
    role: row.role,
  };
}

/** 登录名是 users.account。停用账号不能登录。密码比对为明文等值。 */
export async function authenticateUser(
  account: string,
  password: string
): Promise<AuthUser | null> {
  const row = await prisma.user.findFirst({
    where: { account, password, status: "ACTIVE" },
  });
  return toAuthUser(row);
}

/**
 * 未过期则复用 token，只重置过期时间。
 * token 为空或已过期则签发新值。
 */
export async function issueUserToken(
  account: string,
  ttlMs: number = LOGIN_TOKEN_TTL_MS
): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { account, status: "ACTIVE" },
    select: { id: true, token: true, tokenExpiredAt: true },
  });
  if (!existing) {
    throw new HttpError(500, "无法写入登录 token");
  }

  const expiredAt = new Date(Date.now() + ttlMs);
  const current = existing.token?.trim() || "";
  const stillValid =
    current &&
    isUserToken(current) &&
    existing.tokenExpiredAt != null &&
    existing.tokenExpiredAt.getTime() > Date.now();

  if (stillValid) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { tokenExpiredAt: expiredAt },
    });
    return current;
  }

  const token = randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: existing.id },
    data: { token, tokenExpiredAt: expiredAt },
  });
  return token;
}

export async function findUserByToken(token: string): Promise<AuthUser | null> {
  if (!isUserToken(token)) return null;
  const row = await prisma.user.findFirst({
    where: {
      token,
      status: "ACTIVE",
      tokenExpiredAt: { gt: new Date() },
    },
  });
  return toAuthUser(row);
}

export async function clearUserToken(token: string): Promise<void> {
  if (!isUserToken(token)) return;
  await prisma.user.updateMany({
    where: { token },
    data: { token: null, tokenExpiredAt: null },
  });
}

export function extractBearerToken(
  authorization: string | null | undefined
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

/** 更新显示名、邮箱、手机；传入 newPassword 时先核对当前密码。 */
export async function updateUserProfile(
  account: string,
  patch: ProfileUpdate
): Promise<AuthUser> {
  const current = await prisma.user.findFirst({
    where: { account, status: "ACTIVE" },
  });
  if (!current) {
    throw new HttpError(404, "账号不存在或已停用");
  }

  if (patch.newPassword) {
    if (current.password !== patch.currentPassword) {
      throw new HttpError(400, "当前密码不正确");
    }
  }

  const row = await prisma.user.update({
    where: { id: current.id },
    data: {
      displayName: patch.displayName,
      email: patch.email,
      phone: patch.phone,
      ...(patch.newPassword ? { password: patch.newPassword } : {}),
    },
  });
  const user = toAuthUser(row);
  if (!user) {
    throw new HttpError(404, "账号不存在或已停用");
  }
  return user;
}

export async function requireUser(
  authorization: string | null | undefined
): Promise<AuthUser> {
  const token = extractBearerToken(authorization);
  if (!token) {
    throw new HttpError(401, "未登录");
  }
  const user = await findUserByToken(token);
  if (!user) {
    throw new HttpError(401, "登录已失效");
  }
  return user;
}

type HarnessSsoUser = {
  id: string;
  account: string;
  displayName: string;
  role: "ADMIN" | "USER";
};

type HarnessSsoExchange = {
  user: HarnessSsoUser;
  componentId: string;
};

function harnessOrigin(): string {
  const origin = process.env.HARNESS_ORIGIN?.trim().replace(/\/$/, "");
  if (!origin) {
    throw new HttpError(500, "未配置 HARNESS_ORIGIN");
  }
  return origin;
}

function harnessComponentId(): string {
  const id = process.env.HARNESS_COMPONENT_ID?.trim();
  if (!id) {
    throw new HttpError(500, "未配置 HARNESS_COMPONENT_ID");
  }
  return id;
}

/** 向宿主兑换一次性票据，校验 componentId，缺用户则创建。 */
export async function exchangeHarnessSso(code: string): Promise<{
  token: string;
  user: AuthUser;
}> {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new HttpError(400, "请从 Harness Admin 打开");
  }

  const expectedComponentId = harnessComponentId();
  let payload: HarnessSsoExchange;
  try {
    const res = await fetch(`${harnessOrigin()}/api/sso/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
    const json = (await res.json().catch(() => null)) as
      | HarnessSsoExchange
      | { error?: string; message?: string }
      | null;
    if (
      !res.ok ||
      !json ||
      !("user" in json) ||
      !json.user?.id ||
      !json.user?.account
    ) {
      throw new HttpError(400, "请从 Harness Admin 打开");
    }
    payload = json as HarnessSsoExchange;
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    throw new HttpError(400, "请从 Harness Admin 打开");
  }

  if (payload.componentId !== expectedComponentId) {
    throw new HttpError(400, "请从 Harness Admin 打开");
  }

  const role: UserRole = payload.user.role === "ADMIN" ? "ADMIN" : "USER";
  const displayName = payload.user.displayName?.trim() || payload.user.account;

  let user = await prisma.user.findUnique({
    where: { account: payload.user.account },
  });

  if (!user) {
    const byId = await prisma.user.findUnique({
      where: { id: payload.user.id },
    });
    if (byId) {
      throw new HttpError(400, "请从 Harness Admin 打开");
    }
    user = await prisma.user.create({
      data: {
        id: payload.user.id,
        account: payload.user.account,
        password: SSO_DEFAULT_PASSWORD,
        displayName,
        role,
        status: "ACTIVE",
      },
    });
  } else if (user.status !== "ACTIVE") {
    throw new HttpError(400, "请从 Harness Admin 打开");
  }

  const authUser = toAuthUser(user);
  if (!authUser) {
    throw new HttpError(400, "请从 Harness Admin 打开");
  }

  const token = await issueUserToken(user.account, SSO_TOKEN_TTL_MS);
  return { token, user: authUser };
}
