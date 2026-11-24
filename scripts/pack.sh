#!/usr/bin/env bash
# 一键构建前端（OpenPencil）和 tRPC 服务，打成可直接运行的发布包。
# 产物：release/ui-manage/ 以及 release/ui-manage-<时间>.tar.gz
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGE="$ROOT/release/ui-manage"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="$ROOT/release/ui-manage-$STAMP.tar.gz"

if [[ ! -x server/node_modules/.bin/tsx ]]; then
  echo "缺少后端依赖，请先在仓库根目录执行 pnpm install" >&2
  exit 1
fi

if [[ ! -x vendor/open-pencil/node_modules/.bin/vite ]]; then
  echo "缺少编辑器依赖，请先执行 pnpm editor:install" >&2
  exit 1
fi

echo "==> 构建前端"
(
  cd vendor/open-pencil
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

# Vite publicDir 有时未带上 brand；页面会请求 /brand/app-icon.svg
if [[ ! -f vendor/open-pencil/dist/brand/app-icon.svg && -f vendor/open-pencil/assets/brand/app-icon.svg ]]; then
  mkdir -p vendor/open-pencil/dist/brand
  cp -a vendor/open-pencil/assets/brand/. vendor/open-pencil/dist/brand/
fi

echo "==> 组装发布目录"
rm -rf "$STAGE"
mkdir -p "$STAGE/public" "$STAGE/server"
tar -C server -cf - --exclude node_modules . | tar -C "$STAGE/server" -xf -
mkdir -p "$STAGE/prisma"
cp prisma/package.json prisma/schema.prisma prisma/prisma.config.ts "$STAGE/prisma/"
cp -a prisma/src "$STAGE/prisma/src"
cp -a vendor/open-pencil/dist/. "$STAGE/public/"
cp package.json pnpm-lock.yaml pnpm-workspace.yaml "$STAGE/"
cp .env.example "$STAGE/.env.example"
cp scripts/start.mjs "$STAGE/start.mjs"

echo "==> 安装生产依赖"
(
  cd "$STAGE"
  pnpm install --prod --frozen-lockfile --ignore-scripts
)

if [[ ! -e "$STAGE/server/node_modules/@open-pencil/core" ]]; then
  echo "产物里没有 @open-pencil/core，OpenAPI 画稿运行时会缺依赖" >&2
  exit 1
fi

resolve_runtime() {
  node --input-type=module -e '
    import { createRequire } from "node:module";
    const require = createRequire(process.argv[1]);
    process.stdout.write(require.resolve(process.argv[2]));
  ' "$STAGE/server/node_modules/@open-pencil/core/package.json" "$1"
}

for specifier in \
  yoga-layout \
  "@open-pencil/core/assets/InterVariable.ttf" \
  "@open-pencil/core/assets/Inter-SemiBold.ttf" \
  canvaskit-wasm/bin/full/canvaskit.wasm \
  harfbuzzjs/dist/harfbuzz-subset.wasm
do
  if ! resolve_runtime "$specifier" >/dev/null; then
    echo "产物缺少运行时文件：$specifier" >&2
    exit 1
  fi
done

echo "==> 压缩"
mkdir -p "$ROOT/release"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE" -C "$ROOT/release" ui-manage

echo
echo "打包完成"
echo "目录: $STAGE"
echo "压缩包: $ARCHIVE"
echo
echo "部署机上："
echo "  tar -xzf $(basename "$ARCHIVE")"
echo "  cd ui-manage"
echo "  cp .env.example .env   # 填 DATABASE_URL 和 S3_*"
echo "  node start.mjs         # 默认 0.0.0.0:3000，页面和 /api 同源"
