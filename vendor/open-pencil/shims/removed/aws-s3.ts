
export class S3Client {
  constructor(_opts?: unknown) {}
  send() { return Promise.reject(new Error('S3 client disabled in ui-manage slim')) }
  destroy() {}
}
export class PutObjectCommand { constructor(public input: unknown) {} }
export class GetObjectCommand { constructor(public input: unknown) {} }
export class DeleteObjectCommand { constructor(public input: unknown) {} }
export class HeadObjectCommand { constructor(public input: unknown) {} }
