import { createError, defineEventHandler, readBody } from "h3";
import { exchangeHarnessSso } from "../../utils/auth";

type SsoBody = {
  code?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<SsoBody>(event);
  const code = body.code?.trim() ?? "";
  if (!code) {
    throw createError({ statusCode: 400, message: "请从 Harness Admin 打开" });
  }

  const { token, user } = await exchangeHarnessSso(code);
  return {
    token,
    user: {
      id: user.id,
      account: user.account,
      displayName: user.displayName,
      role: user.role,
    },
  };
});
