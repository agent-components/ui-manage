import { DOCUMENT_EXTENSIONS } from '@open-pencil/core/io'
import type { DocumentKind } from '@open-pencil/scene-graph'

import { pickBrowserSaveFile } from '@/app/document/io/capability'
import { documentFileName } from '@/app/document/io/names'

/** What the save dialog calls a document's file type. */
const FILE_TYPE_NAMES: Readonly<Record<DocumentKind, string>> = {
  design: 'Figma file',
  board: 'FigJam board'
}

export async function chooseBrowserFigSaveHandle(kind: DocumentKind) {
  try {
    return await pickBrowserSaveFile({
      suggestedName: documentFileName('Untitled', kind),
      types: [
        {
          description: FILE_TYPE_NAMES[kind],
          accept: { 'application/octet-stream': [`.${DOCUMENT_EXTENSIONS[kind]}`] }
        }
      ]
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null
    throw error
  }
}
