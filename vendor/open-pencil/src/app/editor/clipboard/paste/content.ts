import type { Editor } from '@open-pencil/core'
import { isSVGMarkup } from '@open-pencil/core/io/formats/svg'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { matchingClipboardSnapshot } from '../memory'

export async function pasteClipboardHTML(
  editor: Editor,
  html: string,
  cursorPos?: Vector,
  options: Parameters<Editor['pasteFromHTML']>[2] = {}
): Promise<void> {
  const snapshot = matchingClipboardSnapshot(html)
  if (snapshot) await editor.pasteSnapshot(snapshot, cursorPos, options)
  else await editor.pasteFromHTML(html, cursorPos, options)
}

/** Where a paste without a copied position goes: the cursor, else the middle of the view. */
export function pastePoint(editor: Editor, cursorPos?: Vector): Vector {
  const { panX, panY, zoom } = editor.state
  return (
    cursorPos ?? {
      x: (-panX + window.innerWidth / 2) / zoom,
      y: (-panY + window.innerHeight / 2) / zoom
    }
  )
}

/** Paste SVG markup, such as Figma's Copy as SVG, as layers; false when the text is not SVG. */
export async function pasteSVGText(
  editor: Editor,
  text: string,
  cursorPos?: Vector
): Promise<boolean> {
  if (!isSVGMarkup(text)) return false
  const { x, y } = pastePoint(editor, cursorPos)
  return editor.pasteSVG(text, x, y)
}

/** Whether pasted text becomes layers of its own (SVG only — Mermaid disabled in ui-manage). */
export function isLayerText(text: string): boolean {
  return isSVGMarkup(text)
}

/** Mermaid paste disabled — ui-manage keeps webpage design drafts only. */
export async function pasteMermaidText(
  _editor: Editor,
  _text: string,
  _cursorPos?: Vector
): Promise<boolean> {
  return false
}

/** Paste text that becomes layers of its own; false for any other text. */
export async function pasteLayerText(
  editor: Editor,
  text: string,
  cursorPos?: Vector
): Promise<boolean> {
  return pasteSVGText(editor, text, cursorPos)
}
