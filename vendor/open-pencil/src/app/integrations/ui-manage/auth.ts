import { ref } from 'vue'

export type AuthUser = {
  id: string
  account: string
  displayName: string
}

const TOKEN_KEY = 'ui_manage_token'
const USER_KEY = 'ui_manage_user'

const token = ref<string | null>(null)
const user = ref<AuthUser | null>(null)
const ready = ref(false)

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    try {
      const data = (await res.json()) as { message?: string; statusMessage?: string }
      message = data.message || data.statusMessage || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export function useUiManageAuth() {
  function loadFromStorage() {
    token.value = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    if (raw) {
      try {
        user.value = JSON.parse(raw) as AuthUser
      } catch {
        user.value = null
      }
    }
    ready.value = true
  }

  function persist(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }

  function clear() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function authHeaders(): HeadersInit {
    if (!token.value) return {}
    return { Authorization: `Bearer ${token.value}` }
  }

  async function login(account: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password })
    })
    const result = await readJson<{ token: string; user: AuthUser }>(res)
    persist(result.token, result.user)
    return result
  }

  async function logout() {
    try {
      if (token.value) {
        await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() })
      }
    } finally {
      clear()
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
    login,
    logout
  }
}
