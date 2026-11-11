
export class CloudAPIError extends Error {
  constructor(message = 'Cloud disabled') { super(message); this.name = 'CloudAPIError' }
}
export class CloudClientError extends CloudAPIError {}
export class CloudDeviceAuthorizationError extends CloudAPIError {}
export class CloudPortalAPIError extends CloudAPIError {}

export function cloudAuthFailure(_e?: unknown) { return { kind: 'unknown' as const } }
export function cloudEditorReturnURL(_origin?: string) { return '/' }
export function cloudRedirectPath(_path?: string) { return '/' }
export function cloudSignInURL(_opts?: unknown) { return '/' }
export function createCloudAIClient(_opts?: unknown) { return null }
export function createCloudAPIClient(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}
export function createCloudAuthClient(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}
export function createCloudPortalClient(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}
export async function discoverCloud(_url?: string) {
  throw new CloudAPIError('Cloud disabled')
}
export async function pollCloudDeviceToken(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}
export async function requestCloudDeviceAuthorization(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}
export async function resendCloudVerification(_opts?: unknown) {}
export async function signInToCloudWithEmail(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}
export async function signOutFromCloud(_opts?: unknown) {}
export async function signUpToCloudWithEmail(_opts?: unknown) {
  throw new CloudAPIError('Cloud disabled')
}

export type CloudSocialProvider = string
export type CloudAuthFailure = { kind: string }
export type CloudAPIClient = Record<string, never>
export type CloudAIClient = Record<string, never>
export type CloudAITokenSource = string
export type CloudPortalClient = Record<string, never>
