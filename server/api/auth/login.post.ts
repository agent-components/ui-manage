import { createError, defineEventHandler, readBody } from "h3";
import { authenticateUser, issueUserToken } from "../../utils/auth";

type LoginBody = {
  account?: string;
  password?: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event);
  const account = body.account?.trim();
  const password = body.password ?? "";

  if (!account || !password) {
    throw createError({ statusCode: 400, message: "请输入账号和密码" });
  }

  const user = await authenticateUser(account, password);
  if (!user) {
    throw createError({ statusCode: 401, message: "账号或密码错误" });
  }

  const token = await issueUserToken(user.account);
  return {
    token,
    user: {
      id: user.id,
      account: user.account,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
});
