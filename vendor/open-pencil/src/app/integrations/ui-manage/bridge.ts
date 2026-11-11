/**
 * Bridge: open/save a design managed by ui-manage (Bearer + /api/designs/:id/content).
 *
 * Same-origin (源码内嵌): token from localStorage, apiBase defaults to ''.
 * Legacy iframe query: ?ui-manage=1&designId=&token=&apiBase=
 */
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import { createTab, getActiveStore, getTabsSnapshot, type Tab } from '@/app/tabs'

import { useUiManageAuth } from './auth'

export type UiManageBridgeConfig = {
  designId: string
  token: string
  apiBase: string
  designName?: string
}

const TOKEN_KEY = 'ui_manage_token'

export function parseUiManageBridge(search: string): UiManageBridgeConfig | null {
  const params = new URLSearchParams(search)
  if (params.get('ui-manage') !== '1') return null
  const designId = params.get('designId')?.trim()
  const token = params.get('token')?.trim()
  if (!designId || !token) return null
  const apiBase = (params.get('apiBase') || '').replace(/\/$/, '')
  return {
    designId,
    token,
    apiBase,
    designName: params.get('name') || undefined
  }
}

export function configFromDesignRoute(
  designId: string,
  designName?: string
): UiManageBridgeConfig | null {
  const token = localStorage.getItem(TOKEN_KEY)?.trim()
  if (!designId || !token) return null
  return {
    designId,
    token,
    apiBase: '',
    designName
  }
}

function contentUrl(cfg: UiManageBridgeConfig) {
  return `${cfg.apiBase}/api/designs/${encodeURIComponent(cfg.designId)}/content`
}

async function fetchDesignMeta(
  cfg: UiManageBridgeConfig
): Promise<{ name: string } | null> {
  const res = await fetch(`${cfg.apiBase}/api/designs/${encodeURIComponent(cfg.designId)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` }
  })
  if (!res.ok) return null
  const data = (await res.json()) as { name?: string }
  return data.name ? { name: data.name } : null
}

async function fetchDesignBytes(cfg: UiManageBridgeConfig): Promise<Uint8Array> {
  const res = await fetch(contentUrl(cfg), {
    headers: { Authorization: `Bearer ${cfg.token}` }
  })
  if (!res.ok) {
    throw new Error(`加载设计稿失败 (${res.status})`)
  }
  return new Uint8Array(await res.arrayBuffer())
}

async function putDesignBytes(cfg: UiManageBridgeConfig, data: Uint8Array): Promise<void> {
  const res = await fetch(contentUrl(cfg), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/octet-stream'
    },
    body: data
  })
  if (!res.ok) {
    throw new Error(`保存失败 (${res.status})`)
  }
}

let activeConfig: UiManageBridgeConfig | null = null
let saveBound = false

export async function saveActiveToUiManage(): Promise<boolean> {
  if (!activeConfig) return false
  const store = getActiveStore()
  try {
    await store.saveFigFileCopy(async (data) => {
      await putDesignBytes(activeConfig!, data)
    })
    toast.info('已保存')
    window.parent?.postMessage(
      { type: 'ui-manage:saved', designId: activeConfig.designId },
      '*'
    )
    return true
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    toast.error(notificationMessages.get().operationFailed({ error: detail }))
    return false
  }
}

/** Parent iframe / host can request a save; Ctrl/Cmd+S is handled by the app menu + keyboard. */
function bindHostSaveMessage() {
  if (saveBound) return
  saveBound = true
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'ui-manage:save') void saveActiveToUiManage()
  })
}

function isBlankDocumentTab(tab: Tab): boolean {
  if (tab.kind !== 'document') return false
  return (
    !tab.store.hasUnsavedChanges() &&
    tab.store.graph.getChildren(tab.store.state.currentPageId).length === 0 &&
    (tab.store.state.documentName === 'Untitled' ||
      tab.store.state.documentName === '未命名设计稿')
  )
}

/** Prefer the startup blank tab so we do not leave an extra Untitled beside the design. */
function takeDocumentTab(): Tab {
  return getTabsSnapshot().find(isBlankDocumentTab) ?? createTab()
}

export async function bootUiManageBridgeWithConfig(
  cfg: UiManageBridgeConfig
): Promise<boolean> {
  activeConfig = cfg
  const auth = useUiManageAuth()
  if (!auth.ready.value) auth.loadFromStorage()
  if (!auth.token.value) {
    localStorage.setItem(TOKEN_KEY, cfg.token)
    auth.token.value = cfg.token
  }
  bindHostSaveMessage()

  if (!cfg.designName) {
    const meta = await fetchDesignMeta(cfg)
    if (meta?.name) cfg.designName = meta.name
  }

  const title = cfg.designName?.trim() || '未命名设计稿'
  const bytes = await fetchDesignBytes(cfg)
  const tab = takeDocumentTab()
  if (bytes.byteLength > 0) {
    const file = new File([bytes], `${title}.fig`)
    await tab.store.openFigFile(file)
  }
  tab.store.state.documentName = title
  if (bytes.byteLength === 0) {
    toast.info('空白稿：编辑后 ⌘/Ctrl+S 保存')
  }
  window.parent?.postMessage({ type: 'ui-manage:ready', designId: cfg.designId }, '*')
  return true
}

/**
 * Opens the managed design in a document tab (blank when content is empty).
 * Call once from WorkspaceView after mount.
 */
export async function bootUiManageBridge(
  search = window.location.search
): Promise<boolean> {
  const cfg = parseUiManageBridge(search)
  if (!cfg) return false
  return bootUiManageBridgeWithConfig(cfg)
}

export async function bootUiManageBridgeFromRoute(
  designId: string,
  designName?: string
): Promise<boolean> {
  const cfg = configFromDesignRoute(designId, designName)
  if (!cfg) return false
  return bootUiManageBridgeWithConfig(cfg)
}
