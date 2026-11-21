/**
 * 发布包入口。由 scripts/pack.sh 复制到 release/ui-manage/start.mjs。
 * 读取同目录 .env（不覆盖已经存在的环境变量），再启动 tRPC 服务。
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// 发布目录里 start.mjs 与 server/ 同级；仓库里它在 scripts/。
const root = existsSync(resolve(here, "server/index.ts"))
  ? here
  : resolve(here, "..");

function loadEnv(file) {
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
process.env.NODE_ENV ||= "production";
process.env.PORT ||= "3000";
process.env.HOST ||= "0.0.0.0";

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
