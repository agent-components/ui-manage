import notoSansScUrl from '@/assets/fonts/NotoSansSC-VF.ttf?url'

import { fontManager } from '@open-pencil/core/text'

/**
 * Simplified Chinese used to arrive as a hundred-odd WOFF2 shards from
 * cdn.jsdelivr.net. The variable file covers the same characters and weights,
 * and ships with the app.
 */
const NOTO_SANS_SC = 'Noto Sans SC'

let file: Promise<ArrayBuffer> | null = null

function readNotoSansSc(): Promise<ArrayBuffer> {
  if (!file) {
    file = fetch(notoSansScUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Noto Sans SC answered ${response.status}`)
        return response.arrayBuffer()
      })
      .catch((error: unknown) => {
        file = null
        throw error
      })
  }
  return file
}

async function bundledNotoSansSc(
  style: string,
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  signal?.throwIfAborted()
  const data = await readNotoSansSc()
  signal?.throwIfAborted()
  if (!fontManager.isStyleLoaded(NOTO_SANS_SC, style)) {
    await fontManager.markLoaded(NOTO_SANS_SC, style, data, 'bundled')
  }
  return fontManager.loadedData(NOTO_SANS_SC, style)
}

/** Serves Noto Sans SC from the packaged file instead of a web-font CDN. */
export function installBundledCjkFonts(): void {
  const original = fontManager.loadRemoteFont.bind(fontManager)
  fontManager.loadRemoteFont = async (family, style = 'Regular', characters = '', signal) => {
    if (family === NOTO_SANS_SC) {
      try {
        const data = await bundledNotoSansSc(style, signal)
        if (data) return data
      } catch (error) {
        if (signal?.aborted) throw error
        console.warn('Bundled Noto Sans SC failed:', error)
      }
    }
    return original(family, style, characters, signal)
  }
}
