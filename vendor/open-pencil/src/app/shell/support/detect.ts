import type { BaselineBrowser } from './baseline'

export type BrowserFamily = 'chrome' | 'edge' | 'opera' | 'firefox' | 'safari' | 'unknown'
export type OperatingSystem = 'macos' | 'ios' | 'windows' | 'linux' | 'android' | 'unknown'

export interface SupportEnvironment {
  readonly host: 'browser'
  readonly os: OperatingSystem
  readonly browser: BrowserFamily
  /** Major version, with the minor kept for Safari (`16.4`), when the UA names it. */
  readonly browserVersion?: number
  readonly userAgent: string
}

/** The user-agent facts the detector reads; injectable for tests. */
export interface NavigatorFacts {
  readonly userAgent: string
  readonly maxTouchPoints: number
}

interface ParsedUserAgent {
  os: OperatingSystem
  browser: BrowserFamily
  browserVersion?: number
}

function versionAfter(userAgent: string, token: RegExp): number | undefined {
  const match = token.exec(userAgent)
  if (!match) return undefined
  const parsed = Number.parseFloat(match[1])
  return Number.isFinite(parsed) ? parsed : undefined
}

function detectOS(userAgent: string, maxTouchPoints: number): OperatingSystem {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios'
  // iPadOS asks for desktop sites with a Macintosh UA; only touch tells it apart.
  if (/Macintosh/.test(userAgent)) return maxTouchPoints > 1 ? 'ios' : 'macos'
  if (/Android/.test(userAgent)) return 'android'
  if (/Windows/.test(userAgent)) return 'windows'
  if (/Linux|X11|CrOS/.test(userAgent)) return 'linux'
  return 'unknown'
}

/**
 * Identify the browser family and version from a user-agent string.
 *
 * Every iOS browser is WebKit, so it reports as Safari with the engine version
 * taken from the `Version/` token or, for third-party shells, the OS version.
 * Chromium forks keep an accurate `Chrome/` major; Opera and Edge add their own
 * token, which only changes the name shown to the user.
 */
export function parseUserAgent(userAgent: string, maxTouchPoints = 0): ParsedUserAgent {
  const os = detectOS(userAgent, maxTouchPoints)

  if (os === 'ios') {
    const version =
      versionAfter(userAgent, /Version\/(\d+(?:\.\d+)?)/) ??
      versionAfter(userAgent.replace(/_/g, '.'), /OS (\d+(?:\.\d+)?)/)
    return { os, browser: 'safari', browserVersion: version }
  }

  const firefox = versionAfter(userAgent, /Firefox\/(\d+)/)
  if (firefox !== undefined) return { os, browser: 'firefox', browserVersion: firefox }

  const chrome = versionAfter(userAgent, /Chrome\/(\d+)/)
  if (chrome !== undefined) {
    if (/Edg\//.test(userAgent)) return { os, browser: 'edge', browserVersion: chrome }
    if (/OPR\//.test(userAgent)) return { os, browser: 'opera', browserVersion: chrome }
    return { os, browser: 'chrome', browserVersion: chrome }
  }

  if (/Safari\//.test(userAgent) || /AppleWebKit\//.test(userAgent)) {
    return {
      os,
      browser: 'safari',
      browserVersion: versionAfter(userAgent, /Version\/(\d+(?:\.\d+)?)/)
    }
  }

  return { os, browser: 'unknown' }
}

export function describeEnvironment(navigatorFacts: NavigatorFacts): SupportEnvironment {
  const parsed = parseUserAgent(navigatorFacts.userAgent, navigatorFacts.maxTouchPoints)
  return { host: 'browser', ...parsed, userAgent: navigatorFacts.userAgent }
}

/** Which baseline entry governs an environment, or `undefined` when none does. */
export function baselineBrowserFor(env: SupportEnvironment): BaselineBrowser | undefined {
  if (env.os === 'ios') return 'ios'
  switch (env.browser) {
    case 'chrome':
    case 'opera':
      return 'chrome'
    case 'edge':
      return 'edge'
    case 'firefox':
      return 'firefox'
    case 'safari':
      return 'safari'
    default:
      return undefined
  }
}
