/**
 * The stored theme setting, shared by the editor, the Cloud server's pages, and the boot splash
 * every page draws before its script loads (`src/splash/theme.ts`), so they all start in one
 * theme. It depends on nothing, so the splash's inlined script stays small.
 */
export const APP_THEMES = ['dark', 'light', 'auto'] as const
export type AppTheme = (typeof APP_THEMES)[number]

export const THEME_STORAGE_KEY = 'open-pencil:theme'
export const DEFAULT_THEME: AppTheme = 'auto'

/** The theme in effect; 未设置或无效值按默认「跟随系统」处理。 */
export function resolveAppTheme(setting: unknown, prefersDark: boolean): 'dark' | 'light' {
  const value =
    setting === 'light' || setting === 'dark' || setting === 'auto'
      ? setting
      : DEFAULT_THEME
  if (value === 'auto') return prefersDark ? 'dark' : 'light'
  return value
}

/** The stored setting as the page starts, or null where storage cannot be read. */
export function readStoredTheme(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    return null
  }
}
