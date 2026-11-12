import { PAGE_DEFAULT_BACKGROUNDS } from '@open-pencil/core/constants'
import { fillToKiwiPaint } from '@open-pencil/fig/node-change'
import type { Tool } from '@open-pencil/core'
import type { SceneNode } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

/** Tools that put a new layer on the current page. */
const CREATION_TOOLS = new Set<Tool>([
  'FRAME',
  'SECTION',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'POLYGON',
  'STAR',
  'TEXT',
  'STICKY',
  'SHAPE_WITH_TEXT',
  'CONNECTOR',
  'PEN',
  'PENCIL',
  'COMMENT'
])

export function toolNeedsPage(tool: Tool): boolean {
  return CREATION_TOOLS.has(tool)
}

/** Drop every page. A new design starts with none until someone adds one. */
export function stripDocumentPages(store: EditorStore): void {
  const pages = store.graph.getPages()
  if (pages.length > 0) {
    store.adoptChanges(() => {
      store.graph.applyImportedStateDuring(() => {
        for (const page of [...store.graph.getPages()]) store.graph.deleteNode(page.id)
      })
    })
  }
  if (store.graph.getNode(store.state.currentPageId)?.type === 'CANVAS') return
  store.state.currentPageId = ''
  store.clearSelection()
  const pane = store.panes.getActivePane()
  pane.currentPageId = ''
  store.requestRender()
}

function paintNewPage(store: EditorStore, page: SceneNode): void {
  const theme = store.state.theme === 'dark' ? 'dark' : 'light'
  const color = { ...PAGE_DEFAULT_BACKGROUNDS[theme] }
  const rawNodeFields = structuredClone(page.source.fig.rawNodeFields)
  rawNodeFields.backgroundPaints = [
    fillToKiwiPaint({
      type: 'SOLID',
      color,
      opacity: 1,
      visible: true,
      blendMode: 'NORMAL'
    })
  ]
  rawNodeFields.backgroundColor = { ...color }
  store.graph.updateNode(page.id, {
    source: {
      ...structuredClone(page.source),
      fig: { ...structuredClone(page.source.fig), rawNodeFields }
    }
  })
  store.state.pageColor = { ...color }
}

/**
 * A draw, paste, or drop needs a page. Reuse one that already exists; otherwise add the first.
 */
export function ensureCreationPage(store: EditorStore): string {
  const current = store.graph.getNode(store.state.currentPageId)
  if (current?.type === 'CANVAS') return current.id
  const existing = store.graph.getPages()
  const page =
    existing[0] ??
    store.graph.addPage(`Page ${store.graph.getPages().length + 1}`)
  if (!existing[0]) paintNewPage(store, page)
  store.state.currentPageId = page.id
  store.panes.getActivePane().currentPageId = page.id
  store.requestRender()
  return page.id
}
