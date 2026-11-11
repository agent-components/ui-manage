import { noop } from 'es-toolkit'
import { computed } from 'vue'

import type { CloudAIClient } from '@open-pencil/cloud/client'

/** ui-manage: Cloud off — no「空间」/workspace; designs are a flat file list. */
export const CLOUD_INCLUDED: boolean = false
export const CLOUD_STORAGE_PROVIDER_ID = 'cloud'

export type CloudAccount = { id: string; email?: string; name?: string }

/** Legacy Save To destination shape retained for stub signatures. */
export type SaveDestination = {
  id: string
  label: string
}

export type SaveFailure = {
  message: string
}

export const openingCloudLink = computed(() => false)
export const cloudAIAvailable = computed(() => false)
export const cloudAIIdentity = computed<string | null>(() => null)
export const cloudBillingURL = computed<string | null>(() => null)

export function cloudAIClient(): CloudAIClient | null {
  return null
}

export function startCloud(): () => void {
  return noop
}

export function isCloudBinding(): boolean {
  return false
}

export function cloudDocumentAddress(): { path: string; query: Record<string, string> } | null {
  return null
}

export function isVersionHistoryOpen(): boolean {
  return false
}

export function openCloudShare(): boolean {
  return false
}
export const openVersionDialog = noop
export const openVersionHistory = noop

export function shownEditorStore<Store>(store: Store): Store {
  return store
}

export function versionPreviewKey(): string {
  return ''
}

export async function cloudSaveDestinations(): Promise<SaveDestination[]> {
  return []
}

export function signInToSaveTo(): boolean {
  return false
}

export async function cloudUploadFailure(): Promise<SaveFailure | null> {
  return null
}

export function useHomeCloud() {
  return {
    signedIn: computed(() => false),
    checking: computed(() => false),
    account: computed<(CloudAccount & { host: string }) | null>(() => null),
    serverId: computed<string | null>(() => null),
    connect: noop,
    openAccount: noop,
    signOut: () => Promise.resolve()
  }
}
