import type { DocumentKind } from '@open-pencil/scene-graph'

export type StorageProviderID = string

/**
 * Where a remote document lived under the old client storage providers.
 * Kept as a minimal shape for editor source state; ui-manage does not set bindings.
 */
export type StorageLocation = {
  providerId: StorageProviderID
  profileId?: string
  containerId?: string
}

export type StorageDocumentBinding = StorageLocation & {
  documentId: string
}

export type StorageDocumentMetadata = {
  name: string
  updatedAt: string
}

export type StorageDocument = StorageDocumentMetadata & {
  id: string
  kind?: DocumentKind
  thumbnailURL?: string | null
  metadataAuthoritative?: boolean
  revision?: string | null
}

export const DEFAULT_STORAGE_PROFILE = 'default'

export function storageProfileId(location: StorageLocation): string {
  return location.profileId ?? DEFAULT_STORAGE_PROFILE
}

export function sameStorageLocation(first: StorageLocation, second: StorageLocation): boolean {
  return (
    first.providerId === second.providerId &&
    storageProfileId(first) === storageProfileId(second) &&
    first.containerId === second.containerId
  )
}

export function sameStorageDocument(
  first: StorageDocumentBinding,
  second: StorageDocumentBinding
): boolean {
  return sameStorageLocation(first, second) && first.documentId === second.documentId
}

/** The location part of a binding or stored row, without its document. */
export function storageLocationOf(source: StorageLocation): StorageLocation {
  const location: StorageLocation = { providerId: source.providerId }
  if (source.profileId !== undefined) location.profileId = source.profileId
  if (source.containerId !== undefined) location.containerId = source.containerId
  return location
}
