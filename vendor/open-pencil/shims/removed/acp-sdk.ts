
export const PROTOCOL_VERSION = 1
export function ndJsonStream(_opts?: unknown) { return { readable: null, writable: null } }
export class ClientSideConnection {
  constructor(_opts?: unknown) {}
  connect() { return Promise.resolve() }
  close() {}
}
