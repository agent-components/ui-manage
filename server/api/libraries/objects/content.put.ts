import {
  createError,
  defineEventHandler,
  getHeader,
  getQuery,
  readRawBody,
} from "h3";
import { requireUser } from "../../../utils/auth";
import { writeLibraryObject } from "../../../utils/library-objects";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const key = getQuery(event).key;
  if (typeof key !== "string" || !key) {
    throw createError({ statusCode: 400, message: "缺少 key" });
  }

  let raw = await readRawBody(event, false);
  if (!raw || raw.length === 0) {
    const chunks: Buffer[] = [];
    for await (const chunk of event.node.req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    raw = chunks.length ? Buffer.concat(chunks) : null;
  }
  if (!raw || raw.length === 0) {
    throw createError({ statusCode: 400, message: "缺少组件库内容" });
  }

  const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  await writeLibraryObject(
    user.account,
    key,
    bytes,
    getHeader(event, "content-type") || "application/json",
    {
      ifMatch: getHeader(event, "if-match") || undefined,
      ifNoneMatch: getHeader(event, "if-none-match") || undefined,
    }
  );
  return { ok: true };
});
