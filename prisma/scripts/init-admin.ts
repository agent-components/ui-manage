import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/client.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv(resolve(root, ".env"));

const account = process.env.ADMIN_ACCOUNT?.trim() || "admin";
const password = process.env.ADMIN_PASSWORD ?? "123456";
const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "管理员";

if (!account || !password) {
  throw new Error("ADMIN_ACCOUNT 和 ADMIN_PASSWORD 不能为空");
}

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error("未配置 DATABASE_URL");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const existing = await prisma.user.findUnique({ where: { account } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: randomUUID(),
        account,
        password,
        displayName,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`已创建管理员 ${account}，密码 ${password}`);
  } else {
    const data: { role?: "ADMIN"; status?: "ACTIVE" } = {};
    if (existing.role !== "ADMIN") data.role = "ADMIN";
    if (existing.status !== "ACTIVE") data.status = "ACTIVE";
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: existing.id }, data });
      console.log(`已将 ${account} 设为启用的管理员，密码未改`);
    } else {
      console.log(`管理员 ${account} 已存在，密码未改`);
    }
  }
} finally {
  await prisma.$disconnect();
}
