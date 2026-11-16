#!/usr/bin/env bash
# 一键构建前端（OpenPencil）和后端（Nitro），打成可直接运行的发布包。
# 产物：release/ui-manage/ 以及 release/ui-manage-<时间>.tar.gz
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGE="$ROOT/release/ui-manage"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$ROOT/release/ui-manage-$STAMP.tar.gz"

if [[ ! -x node_modules/.bin/nitro ]]; then
  echo "缺少后端依赖，请先在仓库根目录执行 pnpm install" >&2
  exit 1
fi

if [[ ! -x vendor/open-pencil/node_modules/.bin/vite ]]; then
  echo "缺少编辑器依赖，请先执行 pnpm editor:install" >&2
  exit 1
fi

if [[ ! -f .env && -z "${DATABASE_URL:-}" ]]; then
  echo "缺少 DATABASE_URL。打包不会连接数据库，但 Prisma 生成客户端需要这个变量。可先 cp .env.example .env" >&2
  exit 1
fi

echo "==> 生成 Prisma Client（本机 + debian-openssl-3.0.x）"
pnpm exec prisma generate

echo "==> 构建前端"
(
  cd vendor/open-pencil
  export OPENPENCIL_UI_MANAGE=1
  ./node_modules/.bin/vite build
)

if [[ ! -f vendor/open-pencil/dist/index.html ]]; then
  echo "前端构建失败：没有 dist/index.html" >&2
  exit 1
fi

if [[ ! -f vendor/open-pencil/dist/canvaskit.wasm ]]; then
  echo "前端构建失败：没有 dist/canvaskit.wasm" >&2
  exit 1
fi

echo "==> 构建后端"
NITRO_PUBLIC_DIST=1 pnpm exec nitro build

if [[ ! -f .output/public/index.html ]]; then
  echo "后端构建失败：.output/public 里没有前端 index.html" >&2
  exit 1
fi

echo "==> 补齐 Prisma 运行时"
node --input-type=module <<'EOF'
import { cpSync, mkdirSync, realpathSync, rmSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const serverModules = resolve(".output/server/node_modules");
mkdirSync(serverModules, { recursive: true });

const clientDir = realpathSync(resolve("node_modules/@prisma/client"));
const generatedDir = resolve(dirname(clientDir), "../.prisma");
if (!existsSync(generatedDir)) {
  console.error("找不到生成的 Prisma Client：", generatedDir);
  process.exit(1);
}

rmSync(resolve(serverModules, "@prisma/client"), { recursive: true, force: true });
rmSync(resolve(serverModules, ".prisma"), { recursive: true, force: true });
mkdirSync(resolve(serverModules, "@prisma"), { recursive: true });
cpSync(clientDir, resolve(serverModules, "@prisma/client"), {
  recursive: true,
  dereference: true,
});
cpSync(generatedDir, resolve(serverModules, ".prisma"), {
  recursive: true,
  dereference: true,
});
EOF

ENGINE_COUNT="$(find .output/server/node_modules/.prisma/client -name 'libquery_engine-*' | wc -l | tr -d ' ')"
if [[ "$ENGINE_COUNT" -lt 1 ]]; then
  echo "Prisma 查询引擎没有打进产物" >&2
  exit 1
fi

if [[ ! -d .output/server/node_modules/@open-pencil/core ]]; then
  echo "产物里没有 @open-pencil/core，MCP 运行时会缺依赖" >&2
  exit 1
fi

# core 以 npm 别名引用 yoga-layout，Nitro 只按真实包名 @open-pencil/yoga-layout 放进产物。
# 没有这个同名链接时，加载 /mcp 会在 import 阶段抛错，对外就是 HTTP 500。
if [[ ! -d .output/server/node_modules/@open-pencil/yoga-layout ]]; then
  echo "产物里没有 @open-pencil/yoga-layout，MCP 排版会缺依赖" >&2
  exit 1
fi
ln -sfn @open-pencil/yoga-layout .output/server/node_modules/yoga-layout

for runtime_file in \
  .output/server/node_modules/@open-pencil/core/assets/InterVariable.ttf \
  .output/server/node_modules/@open-pencil/core/assets/Inter-SemiBold.ttf \
  .output/server/node_modules/canvaskit-wasm/bin/full/canvaskit.wasm \
  .output/server/node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm
do
  if [[ ! -f "$runtime_file" ]]; then
    echo "产物缺少运行时文件：$runtime_file" >&2
    exit 1
  fi
done

echo "==> 组装发布目录"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a .output "$STAGE/.output"
cp .env.example "$STAGE/.env.example"
cp scripts/start.mjs "$STAGE/start.mjs"

echo "==> 压缩"
mkdir -p "$ROOT/release"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE" -C "$ROOT/release" ui-manage

echo
echo "打包完成"
echo "目录: $STAGE"
echo "压缩包: $ARCHIVE"
echo "查询引擎: $ENGINE_COUNT 个"
echo
echo "部署机上："
echo "  tar -xzf $(basename "$ARCHIVE")"
echo "  cd ui-manage"
echo "  cp .env.example .env   # 填 DATABASE_URL 和 S3_*"
echo "  node start.mjs         # 默认 0.0.0.0:3000，页面和 /api、/mcp 同源"
