import { defineEventHandler } from "h3";
import { clearUserToken, extractBearerToken } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const token = extractBearerToken(event);
  if (token) {
    await clearUserToken(token);
  }
  return { ok: true };
});
