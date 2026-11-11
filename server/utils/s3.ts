import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createError } from "h3";

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
    throw createError({
      statusCode: 503,
      message: "S3 未配置",
    });
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
      throw createError({ statusCode: 404, message: "设计稿内容不存在" });
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
      throw createError({ statusCode: 404, message: "设计稿内容不存在" });
    }
    throw error;
  }
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
