
export class FetchHttpHandler {
  constructor(_opts?: unknown) {}
  destroy() {}
  handle() { return Promise.reject(new Error('S3 disabled')) }
}
