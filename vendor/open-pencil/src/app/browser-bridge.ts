import type { EditorStore } from '@/app/editor/session/create'
import { createNavigationBenchmarkHooks } from '@/app/performance/navigation/hooks'
import type { NavigationBenchmarkHooks } from '@/app/performance/navigation/hooks'
import { appRuntimeConfig } from '@/app/runtime/config'
import { IS_BROWSER } from '@/constants'

export interface OpenPencilTestHooks {
  writeCount?: () => number
  mockHandle?: FileSystemFileHandle
  savedOpen?: Window['open']
  navigation?: NavigationBenchmarkHooks
}

export interface OpenPencilWindowAPI {
  getStore?: () => EditorStore
  openFile?: (path: string) => Promise<void>
  test?: OpenPencilTestHooks
}

let activeStore: EditorStore | null = null

function windowAPI(): OpenPencilWindowAPI {
  window.openPencil ??= {}
  window.openPencil.getStore ??= () => {
    if (!activeStore) throw new Error('OpenPencil store not initialized')
    return activeStore
  }
  return window.openPencil
}

export function setOpenPencilStore(store: EditorStore) {
  activeStore = store
  if (!IS_BROWSER) return
  const api = windowAPI()
  if (appRuntimeConfig.navigationBenchmark) {
    const testHooks = (api.test ??= {})
    testHooks.navigation = createNavigationBenchmarkHooks(store)
  }
}

export function setOpenPencilOpenFileHandler(openFile: (path: string) => Promise<void>) {
  windowAPI().openFile = openFile
}
