import { createHash, randomBytes, randomUUID } from "node:crypto";

export const API_TOKEN_PREFIX = "uim_";
export const API_TOKEN_NAME_MAX = 64;
export const API_TOKEN_LIMIT = 20;

const PREFIX_VISIBLE = 8;

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createApiTokenValue(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const secret = randomBytes(32).toString("base64url");
  const token = `${API_TOKEN_PREFIX}${secret}`;
  return {
    token,
    tokenHash: hashApiToken(token),
    tokenPrefix: `${API_TOKEN_PREFIX}${secret.slice(0, PREFIX_VISIBLE)}`,
  };
}

export function isApiTokenFormat(value: string): boolean {
  return value.startsWith(API_TOKEN_PREFIX) && value.length > API_TOKEN_PREFIX.length + 8;
}

export function normalizeTokenName(name: string | undefined): string | null {
  const trimmed = name?.trim() ?? "";
  if (!trimmed || trimmed.length > API_TOKEN_NAME_MAX) return null;
  return trimmed;
}

export function newApiTokenId(): string {
  return randomUUID();
}
