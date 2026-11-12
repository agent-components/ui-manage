import { createError, defineEventHandler, getRouterParam } from "h3";
import { requireUser } from "../../../utils/auth";
import { readShareToken, sharePayload } from "../../../utils/share";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少 id" });
  }

  const shareToken = await readShareToken(id, user.account);
  return sharePayload(shareToken);
});
