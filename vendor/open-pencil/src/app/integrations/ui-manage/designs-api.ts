import { useUiManageAuth } from './auth'

export type Design = {
  id: string
  name: string
  ownerAccount: string
  objectKey: string
  byteSize: number | null
  createdAt: string
  updatedAt: string
}

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

export function useUiManageDesigns() {
  const { authHeaders } = useUiManageAuth()

  function list() {
    return fetch('/api/designs', { headers: authHeaders() }).then((res) =>
      readJson<Design[]>(res)
    )
  }

  function create(name: string) {
    return fetch('/api/designs', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then((res) => readJson<Design>(res))
  }

  function get(id: string) {
    return fetch(`/api/designs/${id}`, { headers: authHeaders() }).then((res) =>
      readJson<Design>(res)
    )
  }

  function rename(id: string, name: string) {
    return fetch(`/api/designs/${id}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then((res) => readJson<Design>(res))
  }

  function remove(id: string) {
    return fetch(`/api/designs/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    }).then((res) => readJson<{ ok: boolean }>(res))
  }

  type ShareState = {
    enabled: boolean
    shareToken: string | null
    url: string | null
  }

  function getShare(id: string) {
    return fetch(`/api/designs/${id}/share`, { headers: authHeaders() }).then(
      (res) => readJson<ShareState>(res)
    )
  }

  function enableShare(id: string) {
    return fetch(`/api/designs/${id}/share`, {
      method: 'POST',
      headers: authHeaders()
    }).then((res) => readJson<ShareState>(res))
  }

  function disableShare(id: string) {
    return fetch(`/api/designs/${id}/share`, {
      method: 'DELETE',
      headers: authHeaders()
    }).then((res) => readJson<ShareState>(res))
  }

  return { list, create, get, rename, remove, getShare, enableShare, disableShare }
}
