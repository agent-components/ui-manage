import { createError, defineEventHandler, readBody } from "h3";
import {
  API_TOKEN_LIMIT,
  API_TOKEN_NAME_MAX,
  createApiTokenValue,
  newApiTokenId,
  normalizeTokenName,
} from "../../utils/api-token";
import { requireUser } from "../../utils/auth";
import { prisma } from "../../utils/prisma";

type CreateBody = {
  name?: string;
};

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<CreateBody>(event);
  const name = normalizeTokenName(body.name);
  if (!name) {
    throw createError({
      statusCode: 400,
      message: `请输入令牌名称（最长 ${API_TOKEN_NAME_MAX} 字）`,
    });
  }

  const activeCount = await prisma.apiToken.count({
    where: { ownerAccount: user.account, revokedAt: null },
  });
  if (activeCount >= API_TOKEN_LIMIT) {
    throw createError({
      statusCode: 400,
      message: `每个账号最多 ${API_TOKEN_LIMIT} 枚访问令牌`,
    });
  }

  const { token, tokenHash, tokenPrefix } = createApiTokenValue();
  const created = await prisma.apiToken.create({
    data: {
      id: newApiTokenId(),
      ownerAccount: user.account,
      name,
      tokenHash,
      tokenPrefix,
    },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return {
    ...created,
    token,
  };
});
