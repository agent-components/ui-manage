/**
 * 容器启动入口：
 * 1) 连接 PostgreSQL，幂等创建 ui_manage schema / 表 / 枚举（平台数据库不会自动建表）
 * 2) 播种管理员账号（默认 admin / 123456，已存在则不改密码）
 * 3) 拉起 tRPC 服务（server/index.ts，由 tsx 直接运行）
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error("[bootstrap] 缺少 DATABASE_URL");
  process.exit(1);
}

const { default: pg } = await import("pg");

const DDL = `
CREATE SCHEMA IF NOT EXISTS ui_manage;

DO $$ BEGIN
  CREATE TYPE ui_manage."UserRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ui_manage."UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ui_manage.users (
  id text PRIMARY KEY,
  account text NOT NULL UNIQUE,
  password text NOT NULL,
  "displayName" text NOT NULL,
  phone text,
  role ui_manage."UserRole" NOT NULL DEFAULT 'USER',
  status ui_manage."UserStatus" NOT NULL DEFAULT 'ACTIVE',
  token text UNIQUE,
  "tokenExpiredAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email text
);

CREATE TABLE IF NOT EXISTS ui_manage.designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_account text NOT NULL,
  object_key text NOT NULL UNIQUE,
  byte_size integer,
  share_token text UNIQUE,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS designs_owner_account_idx ON ui_manage.designs (owner_account);
`;

async function prepare() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(DDL);

    const account = process.env.ADMIN_ACCOUNT?.trim() || "admin";
    const password = process.env.ADMIN_PASSWORD ?? "123456";
    const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "管理员";

    const existing = await client.query(
      `SELECT id, role, status FROM ui_manage.users WHERE account = $1`,
      [account]
    );
    if (existing.rowCount === 0) {
      await client.query(
        `INSERT INTO ui_manage.users (id, account, password, "displayName", role, status)
         VALUES ($1, $2, $3, $4, 'ADMIN', 'ACTIVE')`,
        [randomUUID(), account, password, displayName]
      );
      console.log(`[bootstrap] 已创建管理员 ${account}`);
    } else {
      await client.query(
        `UPDATE ui_manage.users SET role = 'ADMIN', status = 'ACTIVE'
         WHERE account = $1 AND (role <> 'ADMIN' OR status <> 'ACTIVE')`,
        [account]
      );
      console.log(`[bootstrap] 管理员 ${account} 已存在`);
    }
    console.log("[bootstrap] 数据库结构就绪");
  } finally {
    await client.end();
  }
}

await prepare();

process.env.NODE_ENV ||= "production";
process.env.PORT ||= "3000";
process.env.HOST ||= "0.0.0.0";

const { createRequire } = await import("node:module");
const require = createRequire(resolve(root, "server/package.json"));
const tsx = require.resolve("tsx");

const child = spawn(
  process.execPath,
  ["--import", tsx, resolve(root, "server/index.ts")],
  { cwd: root, stdio: "inherit", env: process.env }
);
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});