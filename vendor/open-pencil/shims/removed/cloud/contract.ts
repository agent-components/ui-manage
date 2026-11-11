
export const MAX_PRESENCE_NAME_LENGTH = 64
export const CLOUD_PICTURE_SIZE = 256
export const CLOUD_DOCUMENT_NAME_MAX_LENGTH = 200
export const CLOUD_IMAGE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/
export const DOCUMENT_VERSION_DESCRIPTION_MAX_LENGTH = 500
export const DOCUMENT_VERSION_NAME_MAX_LENGTH = 120
export const MAX_COLLAB_MESSAGE_BYTES = 1_000_000
export const RELAY_CLOSE = 1000
export const RELAY_FORWARDING_BYTES = 0
export const RELAY_SERVER_PEER = 'server'
export const COLLAB_ACTIONS = [] as const

export function presenceName(name: string): string {
  return name.trim().slice(0, MAX_PRESENCE_NAME_LENGTH) || 'Guest'
}
export function cloudServerOrigin(_discovery?: unknown): string { return '' }
export function isCloudPortalPage(_path?: string): boolean { return false }
export function parseCloudLinkPath(_path?: string): null { return null }
export function cloudDesktopLinkURL(_opts?: unknown): string { return '' }
export function cloudDocumentPath(_id?: string): string { return '' }
export function cloudDocumentURL(_opts?: unknown): string { return '' }
export function cloudShareURL(_opts?: unknown): string { return '' }
export function isCloudChecksum(_v?: unknown): boolean { return false }
export function createRelayServerAssembler() {
  return { push() { return null }, reset() {} }
}
export function decodeRelayServerFrame(_data?: unknown) { return null }
export function decodeRoomUpdate(_data?: unknown) { return null }
export function encodeSyncReply(_data?: unknown) { return new Uint8Array() }
export const aiErrorSchema = { '~standard': { version: 1, vendor: 'stub', validate: (v: unknown) => ({ value: v }) } }
export const cloudPresenceSchema = aiErrorSchema
export const relayClientMessages = {}

export type SharedDocument = Record<string, unknown>
export type WorkspaceMembers = Record<string, unknown>
export type WorkspaceRole = string
export type DocumentVersion = Record<string, unknown>
export type DocumentPermission = string
export type CloudSignInMethod = string
export type CloudAccountSession = Record<string, unknown>
export type CloudSignIn = Record<string, unknown>
export type CloudAdminUser = Record<string, unknown>
export type CloudAdminUserFilter = Record<string, unknown>
export type CloudAdminEmailFilter = Record<string, unknown>
export type CloudAdminAuditFilter = Record<string, unknown>
export type CloudDiscovery = Record<string, unknown>
export type WorkspaceSummary = Record<string, unknown>
export type ObjectUploadTarget = Record<string, unknown>
export type DocumentDownload = Record<string, unknown>
export type DocumentImageLink = Record<string, unknown>
export type CloudAccountStatus = string
export type AIToken = Record<string, unknown>
