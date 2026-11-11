import { randomBytes } from "node:crypto";

export function createShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function sharePath(token: string): string {
  return `/share/${encodeURIComponent(token)}`;
}

export function sharePayload(shareToken: string | null) {
  return {
    enabled: Boolean(shareToken),
    shareToken,
    url: shareToken ? sharePath(shareToken) : null,
  };
}
