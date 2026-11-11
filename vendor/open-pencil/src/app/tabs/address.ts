import { isEqual, omit } from 'es-toolkit'
import { watch } from 'vue'
import type { LocationQuery, RouteLocationNormalizedLoaded, Router } from 'vue-router'

import { cloudDocumentAddress, openingCloudLink } from '@/app/cloud/integration'

import { activeTab } from './index'

const CLOUD_DOCUMENT_PREFIX = '/documents/'
/** The query a Cloud document's address adds, and leaving it takes away. */
const CLOUD_DOCUMENT_QUERY = ['version']

export type TabAddress = { path: string; query: LocationQuery }

/**
 * The address for the active tab: its Cloud document's, or the current path (ui-manage designs).
 * Shared rooms are removed in this build.
 */
export function tabAddressFor(
  cloud: { path: string; query: Record<string, string> } | null,
  current: TabAddress,
  opening = false
): TabAddress {
  const query = omit(current.query, CLOUD_DOCUMENT_QUERY)
  if (cloud) return { path: cloud.path, query: { ...query, ...cloud.query } }
  if (current.path.startsWith(CLOUD_DOCUMENT_PREFIX) && !opening) return { path: '/', query }
  return current
}

/**
 * Keeps the address bar on the active tab's Cloud document when present; ui-manage design routes
 * stay put.
 */
export function syncTabAddress(router: Router, route: RouteLocationNormalizedLoaded): () => void {
  let first = true
  return watch(
    () => {
      const store = activeTab.value?.store
      return [store ? cloudDocumentAddress(store) : null, openingCloudLink.value] as const
    },
    ([cloud, opening]) => {
      const current = { path: route.path, query: route.query }
      const next = tabAddressFor(cloud, current, first || opening)
      first = false
      if (next.path === current.path && isEqual(next.query, current.query)) return
      void router.replace({ ...next, hash: route.hash })
    },
    { immediate: true }
  )
}
