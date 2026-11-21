export const TOKEN_KEY = "ui_manage_token";
export const USER_KEY = "ui_manage_user";

/** True when the page is inside an iframe (cross-origin top also counts). */
export function isEmbeddedFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function sessionStore(): Storage {
  return isEmbeddedFrame() ? sessionStorage : localStorage;
}

export function authHeaderRecord(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = sessionStore().getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
