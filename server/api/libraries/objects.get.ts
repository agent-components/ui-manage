import { createError, defineEventHandler, getQuery } from "h3";
import { requireUser } from "../../utils/auth";
import { listLibraryObjects } from "../../utils/library-objects";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const prefix = getQuery(event).prefix;
  if (typeof prefix !== "string" || !prefix) {
    throw createError({ statusCode: 400, message: "缺少 prefix" });
  }
  const objects = await listLibraryObjects(user.account, prefix);
  return { objects };
});
