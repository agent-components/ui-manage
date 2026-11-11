import {
  createIconProvider,
  createSFSymbolsProvider,
  SF_SYMBOLS_PREFIX
} from '@open-pencil/core/icons'

import { browserWebFontFetch } from '@/app/editor/fonts/browser-fetch'

/**
 * The app's icons: Iconify / Material Symbols via browser font fetch.
 * Desktop SF Symbols path removed (no Tauri).
 */
export const appIcons = createIconProvider(browserWebFontFetch)
