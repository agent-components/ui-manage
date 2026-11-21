import { ref } from "vue";

import { sessionStore, TOKEN_KEY, USER_KEY } from "./session";
import { trpc } from "./trpc";

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

const token = ref<string | null>(null);
const user = ref<AuthUser | null>(null);
const ready = ref(false);
/** Avoid hitting auth.me on every navigation once the session is known good. */
let sessionOk = false;

export function useUiManageAuth() {
  function loadFromStorage() {
    const store = sessionStore();
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
    const store = sessionStore();
    token.value = nextToken;
    user.value = nextUser;
    sessionOk = true;
    store.setItem(TOKEN_KEY, nextToken);
    store.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function applyUser(nextUser: AuthUser) {
    const store = sessionStore();
    user.value = nextUser;
    sessionOk = true;
    store.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function clear() {
    const store = sessionStore();
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
      const me = await trpc.auth.me.query();
      user.value = me;
      sessionStore().setItem(USER_KEY, JSON.stringify(me));
      sessionOk = true;
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function login(account: string, password: string) {
    const result = await trpc.auth.login.mutate({ account, password });
    persist(result.token, result.user);
    return result;
  }

  async function exchangeSso(code: string) {
    const result = await trpc.auth.sso.mutate({ code });
    persist(result.token, result.user);
    return result;
  }

  async function refreshUser() {
    if (!ready.value) loadFromStorage();
    const me = await trpc.auth.me.query();
    applyUser(me);
    return me;
  }

  async function updateProfile(body: ProfileUpdate) {
    const me = await trpc.auth.updateProfile.mutate(body);
    applyUser(me);
    return me;
  }

  async function logout() {
    try {
      if (token.value) await trpc.auth.logout.mutate();
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
