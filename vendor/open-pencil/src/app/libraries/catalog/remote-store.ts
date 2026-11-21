import { useUiManageAuth } from '@/app/integrations/ui-manage/auth'
import { trpc } from '@/app/integrations/ui-manage/trpc'

import type { LibraryObjectStore } from './storage'

function requestHeaders(): HeadersInit {
  const auth = useUiManageAuth()
  if (!auth.ready.value && typeof localStorage !== 'undefined') auth.loadFromStorage()
  return auth.authHeaders()
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string; statusMessage?: string }
    return data.message || data.statusMessage || `请求失败 (${res.status})`
  } catch {
    return `请求失败 (${res.status})`
  }
}

export class RemoteLibraryObjectStore implements LibraryObjectStore {
  async getObject(key: string): Promise<Uint8Array | null> {
    const value = await this.getObjectValue(key)
    return value.bytes
  }

  async getObjectValue(key: string): Promise<{ bytes: Uint8Array | null; etag: string | null }> {
    const res = await fetch(`/api/libraries/objects/content?key=${encodeURIComponent(key)}`, {
      headers: requestHeaders()
    })
    if (res.status === 404) return { bytes: null, etag: null }
    if (!res.ok) throw new Error(await errorMessage(res))
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      etag: res.headers.get('etag')
    }
  }

  async putObject(
    key: string,
    bytes: Uint8Array,
    contentType: string,
    options?: { ifMatch?: string; ifNoneMatch?: '*' }
  ): Promise<void> {
    const headers = new Headers(requestHeaders())
    headers.set('content-type', contentType)
    if (options?.ifMatch) headers.set('if-match', options.ifMatch)
    if (options?.ifNoneMatch) headers.set('if-none-match', options.ifNoneMatch)
    const res = await fetch(`/api/libraries/objects/content?key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers,
      body: bytes
    })
    if (!res.ok) throw new Error(await errorMessage(res))
  }

  async listObjects(
    prefix: string
  ): Promise<Array<{ key: string; size: number | null; etag: string | null }>> {
    const data = await trpc.libraries.list.query({ prefix })
    return data.objects ?? []
  }
}
