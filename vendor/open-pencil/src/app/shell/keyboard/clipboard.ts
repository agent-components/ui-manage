import { useEventListener } from '@vueuse/core'

import { extractImageFilesFromClipboard } from '@open-pencil/vue/canvas/drop'

import type { EditorStore } from '@/app/editor/active-store'
import { ensureCreationPage } from '@/app/integrations/ui-manage/blank-document'
import { isUiManageEmbed } from '@/app/integrations/ui-manage/mode'
import { isDesignClipboardHTML } from '@/app/editor/clipboard/html'
import { getInMemoryClipboardHTML, matchingClipboardSnapshot } from '@/app/editor/clipboard/memory'
import {
  isLayerText,
  pasteClipboardHTML,
  pasteLayerText,
  pastePoint
} from '@/app/editor/clipboard/paste/content'
import { pasteWebClipboard } from '@/app/editor/clipboard/paste/web'
import { browserSystemClipboard } from '@/app/editor/clipboard/system/browser'
import type { SystemClipboard } from '@/app/editor/clipboard/system/types'
import { hasDocumentTextSelection, isEditing } from '@/app/shell/keyboard/focus'

function cursorPosition(store: EditorStore) {
  const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
  return ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined
}

export async function copyAndDeleteSelection(
  store: EditorStore,
  clipboard: SystemClipboard = browserSystemClipboard
): Promise<boolean> {
  try {
    const selectedIds = new Set(store.state.selectedIds)
    if (!(await clipboard.copy(store)) || !selectionMatches(store, selectedIds)) return false
    store.deleteSelected()
    return true
  } catch (error) {
    console.warn('Browser clipboard cut failed', error)
    return false
  }
}

function selectionMatches(store: EditorStore, selectedIds: Set<string>): boolean {
  return (
    selectedIds.size === store.state.selectedIds.size &&
    [...selectedIds].every((id) => store.state.selectedIds.has(id))
  )
}

export function bindEditorClipboard(store: EditorStore) {
  useEventListener(window, 'copy', (e: ClipboardEvent) => {
    if (isEditing(e) || hasDocumentTextSelection()) return
    e.preventDefault()
    void browserSystemClipboard.copy(store)
  })

  useEventListener(window, 'cut', (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    void copyAndDeleteSelection(store)
  })

  useEventListener(window, 'paste', (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (isUiManageEmbed) ensureCreationPage(store)

    const cursorPos = cursorPosition(store)

    const imageFiles = extractImageFilesFromClipboard(e)
    if (imageFiles.length) {
      const { x, y } = pastePoint(store, cursorPos)
      void store.placeImageFiles(imageFiles, x, y)
      return
    }

    // Like Figma, Paste keeps the copied position; Paste here in the canvas menu uses the cursor.
    const html = e.clipboardData?.getData('text/html') ?? ''
    if (html && isDesignClipboardHTML(html)) {
      void pasteClipboardHTML(store, html)
      return
    }

    const text = e.clipboardData?.getData('text/plain') ?? ''
    if (isLayerText(text)) {
      void pasteLayerText(store, text, cursorPos)
      return
    }

    // A copy of ours whose markers the browser dropped still pastes as the copied layers.
    if (html && matchingClipboardSnapshot(html)) {
      void pasteClipboardHTML(store, html)
      return
    }

    // Text and web pages from elsewhere paste as text, as in Figma, offering layers for HTML.
    if (html || text) {
      void pasteWebClipboard(store, { html, text }, cursorPos)
      return
    }

    const memoryHTML = getInMemoryClipboardHTML()
    if (memoryHTML) {
      void pasteClipboardHTML(store, memoryHTML)
    }
  })
}
