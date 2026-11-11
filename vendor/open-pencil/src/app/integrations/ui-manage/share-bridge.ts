/**
 * Public share preview: load via /api/share/:token, always read-only, poll updatedAt.
 */
import { ref } from 'vue'

import { toast } from '@/app/shell/ui'
import { createTab, getActiveStore, getTabsSnapshot, type Tab } from '@/app/tabs'

const POLL_MS = 10_000

export type ShareMeta = {
  name: string
  updatedAt: string
}

const sharePreviewActive = ref(false)

export function isUiManageSharePreview(): boolean {
  return sharePreviewActive.value
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let activeToken: string | null = null
let lastUpdatedAt: string | null = null

function isBlankDocumentTab(tab: Tab): boolean {
  if (tab.kind !== 'document') return false
  return (
    !tab.store.hasUnsavedChanges() &&
    tab.store.graph.getChildren(tab.store.state.currentPageId).length === 0 &&
    (tab.store.state.documentName === 'Untitled' ||
      tab.store.state.documentName === '未命名设计稿')
  )
}

function takeDocumentTab(): Tab {
  return getTabsSnapshot().find(isBlankDocumentTab) ?? createTab()
}

async function fetchShareMeta(token: string): Promise<ShareMeta> {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}`)
  if (!res.ok) {
    throw new Error(res.status === 404 ? '分享不存在或已关闭' : `加载分享失败 (${res.status})`)
  }
  return (await res.json()) as ShareMeta
}

async function fetchShareBytes(token: string): Promise<Uint8Array> {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}/content`)
  if (!res.ok) {
    throw new Error(`加载设计稿失败 (${res.status})`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

const patchedStores = new WeakSet<object>()

/**
 * Core's read-only allowlist omits `reportPresented`, so enabling read-only breaks the
 * canvas lifecycle. Temporarily clear the flag while reporting presentation.
 */
function enableShareReadOnly(store: ReturnType<typeof getActiveStore>): void {
  if (!patchedStores.has(store)) {
    patchedStores.add(store)
    const report = store.reportPresented.bind(store)
    store.reportPresented = ((versions) => {
      const was = store.state.hostRestrictions.readOnly
      if (was) {
        store.state.hostRestrictions = { ...store.state.hostRestrictions, readOnly: false }
      }
      try {
        return report(versions)
      } finally {
        if (was) {
          store.state.hostRestrictions = { ...store.state.hostRestrictions, readOnly: true }
        }
      }
    }) as typeof store.reportPresented
  }
  store.setReadOnly(true)
  // Canvas-only share view: no editor chrome; play mode = pan-only preview.
  store.state.showUI = false
  store.startPlay()
}

async function applyShareDocument(token: string, meta: ShareMeta): Promise<void> {
  const title = meta.name.trim() || '未命名设计稿'
  const bytes = await fetchShareBytes(token)
  const tab = takeDocumentTab()
  if (bytes.byteLength > 0) {
    const file = new File([bytes], `${title}.fig`)
    await tab.store.openFigFile(file)
  }
  tab.store.state.documentName = title
  enableShareReadOnly(tab.store)
}

function stopSharePolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function stopSharePreview(): void {
  stopSharePolling()
  activeToken = null
  lastUpdatedAt = null
  sharePreviewActive.value = false
}

function startSharePolling(token: string): void {
  stopSharePolling()
  pollTimer = setInterval(() => {
    void (async () => {
      if (!activeToken || activeToken !== token) return
      try {
        const meta = await fetchShareMeta(token)
        if (meta.updatedAt === lastUpdatedAt) return
        lastUpdatedAt = meta.updatedAt
        await applyShareDocument(token, meta)
      } catch (error) {
        console.error('[ui-manage share poll]', error)
        if (error instanceof Error && error.message.includes('已关闭')) {
          stopSharePreview()
          toast.error(error.message)
        }
      }
    })()
  }, POLL_MS)
}

/** Open a shared design read-only and keep it updated every 10s after saves. */
export async function bootSharePreview(token: string): Promise<boolean> {
  const trimmed = token.trim()
  if (!trimmed) return false

  stopSharePreview()
  sharePreviewActive.value = true
  activeToken = trimmed

  const meta = await fetchShareMeta(trimmed)
  lastUpdatedAt = meta.updatedAt
  await applyShareDocument(trimmed, meta)
  startSharePolling(trimmed)
  return true
}
