import { ref } from "vue";

export type AuthUser = {
  id: string;
  account: string;
  displayName: string;
};

const TOKEN_KEY = "ui_manage_token";
const USER_KEY = "ui_manage_user";

const token = ref<string | null>(null);
const user = ref<AuthUser | null>(null);
const ready = ref(false);
/** Avoid hitting /api/auth/me on every navigation once the session is known good. */
let sessionOk = false;

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const data = (await res.json()) as {
        message?: string;
        statusMessage?: string;
      };
      message = data.message || data.statusMessage || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function useUiManageAuth() {
  function loadFromStorage() {
    token.value = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        user.value = JSON.parse(raw) as AuthUser;
      } catch {
        user.value = null;
      }
    }
    ready.value = true;
  }

  function persist(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken;
    user.value = nextUser;
    sessionOk = true;
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function clear() {
    token.value = null;
    user.value = null;
    sessionOk = false;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authHeaders(): HeadersInit {
    if (!token.value) return {};
    return { Authorization: `Bearer ${token.value}` };
  }

  /** True only with a live login; expired/invalid tokens are cleared. */
  async function ensureSession(): Promise<boolean> {
    if (!ready.value) loadFromStorage();
    if (!token.value) return false;
    if (sessionOk && user.value) return true;
    try {
      const res = await fetch("/api/auth/me", { headers: authHeaders() });
      if (!res.ok) {
        clear();
        return false;
      }
      const me = await readJson<AuthUser>(res);
      user.value = me;
      localStorage.setItem(USER_KEY, JSON.stringify(me));
      sessionOk = true;
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function login(account: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const result = await readJson<{ token: string; user: AuthUser }>(res);
    persist(result.token, result.user);
    return result;
  }

  async function logout() {
    try {
      if (token.value) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: authHeaders(),
        });
      }
    } finally {
      clear();
    }
  }

  return {
    token,
    user,
    ready,
    loadFromStorage,
    persist,
    clear,
    authHeaders,
    ensureSession,
    login,
    logout,
  };
}
