import { createError, defineEventHandler, readBody } from "h3";
import { requireUser, updateUserProfile } from "../../utils/auth";

type ProfileBody = {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  aboutMe?: string | null;
  currentPassword?: string;
  newPassword?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyToNull(
  value: string | null | undefined,
  max: number,
  label: string
): string | null {
  const text = (value ?? "").trim();
  if (!text) return null;
  if (text.length > max) {
    throw createError({
      statusCode: 400,
      message: `${label}不能超过 ${max} 个字符`,
    });
  }
  return text;
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<ProfileBody>(event);

  const displayName = body.displayName?.trim() ?? "";
  if (!displayName) {
    throw createError({ statusCode: 400, message: "显示名称不能为空" });
  }
  if (displayName.length > 64) {
    throw createError({
      statusCode: 400,
      message: "显示名称不能超过 64 个字符",
    });
  }

  const email = emptyToNull(body.email, 120, "邮箱");
  if (email && !EMAIL.test(email)) {
    throw createError({ statusCode: 400, message: "邮箱格式不正确" });
  }

  const phone = emptyToNull(body.phone, 32, "手机");
  const aboutMe = emptyToNull(body.aboutMe, 500, "个人简介");
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (currentPassword || newPassword) {
    if (!currentPassword) {
      throw createError({ statusCode: 400, message: "请输入当前密码" });
    }
    if (!newPassword) {
      throw createError({ statusCode: 400, message: "请输入新密码" });
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      throw createError({
        statusCode: 400,
        message: "新密码长度需为 6 到 72 个字符",
      });
    }
  }

  return updateUserProfile(user.account, {
    displayName,
    email,
    phone,
    aboutMe,
    currentPassword: newPassword ? currentPassword : undefined,
    newPassword: newPassword || undefined,
  });
});
