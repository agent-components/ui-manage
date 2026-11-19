import { ref } from "vue";

import { isEmbeddedFrame } from "./mode";

export type AuthUser = {
  id: string;
  account: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

export type ProfileUpdate = {
  displayName: string;
  email?: string | null;
  phone?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

const TOKEN_KEY = "ui_manage_token";
const USER_KEY = "ui_manage_user";

const token = ref<string | null>(null);
const user = ref<AuthUser | null>(null);
const ready = ref(false);
/** Avoid hitting /api/auth/me on every navigation once the session is known good. */
let sessionOk = false;

function storage(): Storage {
  return isEmbeddedFrame() ? sessionStorage : localStorage;
}

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
    const store = storage();
    token.value = store.getItem(TOKEN_KEY);
    const raw = store.getItem(USER_KEY);
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
    const store = storage();
    token.value = nextToken;
    user.value = nextUser;
    sessionOk = true;
    store.setItem(TOKEN_KEY, nextToken);
    store.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function applyUser(nextUser: AuthUser) {
    const store = storage();
    user.value = nextUser;
    sessionOk = true;
    store.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function clear() {
    const store = storage();
    token.value = null;
    user.value = null;
    sessionOk = false;
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
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
      storage().setItem(USER_KEY, JSON.stringify(me));
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

  async function exchangeSso(code: string) {
    const res = await fetch("/api/auth/sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const result = await readJson<{ token: string; user: AuthUser }>(res);
    persist(result.token, result.user);
    return result;
  }

  async function refreshUser() {
    if (!ready.value) loadFromStorage();
    const res = await fetch("/api/auth/me", { headers: authHeaders() });
    const me = await readJson<AuthUser>(res);
    applyUser(me);
    return me;
  }

  async function updateProfile(body: ProfileUpdate) {
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const me = await readJson<AuthUser>(res);
    applyUser(me);
    return me;
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
    refreshUser,
    updateProfile,
    login,
    exchangeSso,
    logout,
  };
}

/** Logged-in account label. Empty when nobody is signed in. */
export function currentUserName(): string {
  const auth = useUiManageAuth();
  if (!auth.ready.value && typeof window !== "undefined") {
    auth.loadFromStorage();
  }
  return (
    auth.user.value?.displayName?.trim() ||
    auth.user.value?.account?.trim() ||
    ""
  );
}
