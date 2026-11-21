import { HttpError } from "./http-error";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type S3Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
};

export function getS3Config(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim() || "us-east-1";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    region,
    forcePathStyle,
  };
}

export function requireS3Config(): S3Config {
  const config = getS3Config();
  if (!config) {
    throw new HttpError(503, "S3 未配置");
  }
  return config;
}

function createClient(config: S3Config) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function designObjectKey(ownerAccount: string, id: string) {
  return `ui_manage/${ownerAccount}/${id}.fig`;
}

export async function putDesignObject(objectKey: string, body: Uint8Array) {
  const config = requireS3Config();
  const client = createClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: "application/octet-stream",
    })
  );
}

export async function getDesignObject(objectKey: string): Promise<Uint8Array> {
  const config = requireS3Config();
  const client = createClient(config);
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) {
      throw new HttpError(404, "设计稿内容不存在");
    }
    return bytes;
  } catch (error: unknown) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name?: string }).name)
        : "";
    const code =
      error && typeof error === "object" && "Code" in error
        ? String((error as { Code?: string }).Code)
        : "";
    if (name === "NoSuchKey" || code === "NoSuchKey") {
      throw new HttpError(404, "设计稿内容不存在");
    }
    throw error;
  }
}

export type StoredObject = {
  bytes: Uint8Array;
  etag: string | null;
};

export type StoredObjectListing = {
  key: string;
  size: number | null;
  etag: string | null;
};

function isMissingObject(error: unknown): boolean {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name)
      : "";
  const code =
    error && typeof error === "object" && "Code" in error
      ? String((error as { Code?: string }).Code)
      : "";
  const status =
    error && typeof error === "object" && "$metadata" in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode
      : undefined;
  return (
    name === "NoSuchKey" ||
    name === "NotFound" ||
    code === "NoSuchKey" ||
    status === 404
  );
}

export async function getStoredObject(
  objectKey: string
): Promise<StoredObject | null> {
  const config = requireS3Config();
  const client = createClient(config);
  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return null;
    return { bytes, etag: result.ETag ?? null };
  } catch (error: unknown) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function putStoredObject(
  objectKey: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const config = requireS3Config();
  const client = createClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function listStoredObjects(
  prefix: string
): Promise<StoredObjectListing[]> {
  const config = requireS3Config();
  const client = createClient(config);
  const objects: StoredObjectListing[] = [];
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        ContinuationToken: token,
      })
    );
    for (const item of page.Contents ?? []) {
      if (!item.Key) continue;
      objects.push({
        key: item.Key,
        size: item.Size ?? null,
        etag: item.ETag ?? null,
      });
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

export async function deleteDesignObject(objectKey: string): Promise<void> {
  const config = getS3Config();
  if (!config) return;
  const client = createClient(config);
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      })
    );
  } catch (error) {
    console.error("[s3] delete failed", objectKey, error);
  }
}
