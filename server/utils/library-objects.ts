import { createError } from "h3";
import {
  getStoredObject,
  listStoredObjects,
  putStoredObject,
  type StoredObject,
  type StoredObjectListing,
} from "./s3";

/** Matches `@open-pencil/core` `MAX_LIBRARY_REVISION_BYTES`. */
const MAX_LIBRARY_OBJECT_BYTES = 50 * 1024 * 1024;
const LOGICAL_ROOT = "open-pencil/libraries/";

function accountPrefix(account: string): string {
  return `ui_manage/${account}/libraries/`;
}

function assertLogicalKey(key: string): void {
  if (
    !key.startsWith(LOGICAL_ROOT) ||
    key.includes("..") ||
    key.includes("\\") ||
    key.includes("\0")
  ) {
    throw createError({ statusCode: 400, message: "非法的组件库对象键" });
  }
}

export function physicalLibraryKey(
  account: string,
  logicalKey: string
): string {
  assertLogicalKey(logicalKey);
  return `${accountPrefix(account)}${logicalKey}`;
}

function assertPrefix(prefix: string): void {
  if (
    prefix.includes("..") ||
    prefix.includes("\\") ||
    prefix.includes("\0") ||
    (!LOGICAL_ROOT.startsWith(prefix) && !prefix.startsWith(LOGICAL_ROOT))
  ) {
    throw createError({ statusCode: 400, message: "非法的组件库前缀" });
  }
}

function normalizeEtag(value: string | null | undefined): string | null {
  if (!value) return null;
  let text = value.trim();
  if (text.startsWith("W/")) text = text.slice(2).trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    text = text.slice(1, -1);
  }
  return text || null;
}

export async function readLibraryObject(
  account: string,
  logicalKey: string
): Promise<StoredObject | null> {
  return getStoredObject(physicalLibraryKey(account, logicalKey));
}

export async function writeLibraryObject(
  account: string,
  logicalKey: string,
  body: Uint8Array,
  contentType: string,
  condition?: { ifMatch?: string; ifNoneMatch?: string }
): Promise<void> {
  if (body.byteLength > MAX_LIBRARY_OBJECT_BYTES) {
    throw createError({ statusCode: 413, message: "组件库对象超过大小限制" });
  }
  const physical = physicalLibraryKey(account, logicalKey);
  const current = await getStoredObject(physical);
  if (condition?.ifNoneMatch === "*" && current) {
    throw createError({
      statusCode: 412,
      message: "组件库修订冲突，请重新发布",
    });
  }
  if (condition?.ifMatch) {
    const expected = normalizeEtag(condition.ifMatch);
    const actual = normalizeEtag(current?.etag);
    if (!current || !expected || expected !== actual) {
      throw createError({
        statusCode: 412,
        message: "组件库修订冲突，请重新发布",
      });
    }
  }
  await putStoredObject(physical, body, contentType || "application/json");
}

export async function listLibraryObjects(
  account: string,
  prefix: string
): Promise<StoredObjectListing[]> {
  assertPrefix(prefix);
  const root = accountPrefix(account);
  const listed = await listStoredObjects(`${root}${prefix}`);
  return listed.flatMap((item) => {
    if (!item.key.startsWith(root)) return [];
    return [{ ...item, key: item.key.slice(root.length) }];
  });
}
