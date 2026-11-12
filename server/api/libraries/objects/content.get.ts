import { createError, defineEventHandler, getQuery, send, setHeader } from "h3";
import { requireUser } from "../../../utils/auth";
import { readLibraryObject } from "../../../utils/library-objects";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const key = getQuery(event).key;
  if (typeof key !== "string" || !key) {
    throw createError({ statusCode: 400, message: "缺少 key" });
  }
  const object = await readLibraryObject(user.account, key);
  if (!object) {
    throw createError({ statusCode: 404, message: "组件库对象不存在" });
  }
  if (object.etag) setHeader(event, "etag", object.etag);
  setHeader(event, "content-type", "application/octet-stream");
  return send(event, Buffer.from(object.bytes));
});
