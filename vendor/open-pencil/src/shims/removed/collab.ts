/** Stub for `@open-pencil/collab` — multiplayer sync is disabled. */

export class CollabEditor {
  constructor(_doc?: unknown) {}
  dispose(): void {}
}

export function applyRemoteUpdate(_editor: unknown, _update: unknown): void {}
export function encodeStateAsUpdate(_editor: unknown): Uint8Array {
  return new Uint8Array()
}
