import { useLocalStorage } from '@vueuse/core'
import { watch } from 'vue'

import {
  DEFAULT_WEB_FONT_PROVIDER_SETTINGS,
  WEB_FONT_PROVIDER_IDS,
  fontManager,
  prepareGraphFonts,
  type FontFamilyOption,
  type HostFontFamily,
  type LocalFontAccessState,
  type WebFontProviderId
} from '@open-pencil/core/text'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { browserWebFontFetch } from '@/app/editor/fonts/browser-fetch'
import { installBundledCjkFonts } from '@/app/editor/fonts/bundled-cjk'

if (typeof navigator !== 'undefined') {
  fontManager.setFallbackUserAgent(navigator.userAgent)
}

export type FontProviderSettings = Record<WebFontProviderId, boolean>

/** Online fonts are on until turned off in Settings. */
export const DEFAULT_ONLINE_FONTS = true
export const onlineFontsEnabled = useLocalStorage('op-online-fonts-enabled', DEFAULT_ONLINE_FONTS)
export const fontProviderSettings = useLocalStorage<FontProviderSettings>(
  'op-font-providers',
  DEFAULT_WEB_FONT_PROVIDER_SETTINGS
)

watch(
  [onlineFontsEnabled, fontProviderSettings],
  () => {
    fontManager.setOnlineFontProviders(
      onlineFontsEnabled.value
        ? Object.fromEntries(
            WEB_FONT_PROVIDER_IDS.map((provider) => [
              provider,
              // Google fonts need a native CORS bypass; keep them off in the browser.
              fontProviderSettings.value[provider] && provider !== 'google'
            ])
          )
        : {}
    )
  },
  { deep: true, immediate: true }
)

fontManager.setWebFontFetch(browserWebFontFetch)
installBundledCjkFonts()

export function preloadFonts(): void {
  if (onlineFontsEnabled.value) fontManager.preloadWebFontFamilies()
}

export function localFontAccessState(): LocalFontAccessState {
  return fontManager.localAccessState()
}

export async function requestLocalFontAccess(): Promise<FontFamilyOption[]> {
  await fontManager.requestLocalFontAccess()
  return listFamilies()
}

export async function downloadedFontCacheSummary() {
  return { count: 0, byteLength: 0, updatedAt: null }
}

export async function clearDownloadedFontCache(): Promise<void> {}

export async function predownloadFallbackFonts() {
  return fontManager.ensureFallbackPack()
}

export async function listFamilies(): Promise<FontFamilyOption[]> {
  return fontManager.listFamilyOptions()
}

export async function listFonts(): Promise<HostFontFamily[]> {
  return []
}

interface FontRenderInvalidator {
  invalidateNodesForFonts(graph: SceneGraph, nodeIds: readonly string[]): void
}

/**
 * Prepares the fonts of `nodeIds` with the app's loader, keeping them off the canvas meanwhile;
 * resolves to whether that changed any face their text draws with.
 */
export async function ensureGraphFonts(
  graph: SceneGraph,
  nodeIds: string[],
  renderer?: FontRenderInvalidator | null
): Promise<boolean> {
  try {
    const prepared = await prepareGraphFonts(graph, nodeIds, {
      loadFont,
      hide: true,
      treatUnknownCoverageAsMissing: false
    })
    return prepared.changed
  } finally {
    renderer?.invalidateNodesForFonts(graph, nodeIds)
  }
}

export async function loadFont(
  family: string,
  style = 'Regular',
  characters = '',
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  return fontManager.loadFont(family, style, characters, signal)
}
