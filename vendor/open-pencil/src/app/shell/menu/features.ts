import { useEditorStore } from '@/app/editor/active-store'
import { showsDocument } from '@/app/tabs'

import type { AppMenuFeature } from './schema'

const store = useEditorStore()

const available: Record<AppMenuFeature, () => boolean> = {
  // Home and a New file tab hold no document, so they leave out what edits or shows one.
  document: () => showsDocument(),
  // Cloud and storage documents always save; auto-save is a choice only for a file on disk.
  'local-file': () => store.hasWritableSource() && !store.getStorageBinding(),
  // ui-manage: feedback / donation entry points removed
  reports: () => false,
  donation: () => false
}

/** Whether a menu item that waits for a feature shows; items without one always do. */
export function menuFeatureAvailable(feature: AppMenuFeature | undefined): boolean {
  return feature === undefined || available[feature]()
}
