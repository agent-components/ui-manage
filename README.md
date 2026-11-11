# ui-manage

设计稿管理：OpenPencil 编辑器（`vendor/open-pencil`）+ Nitro API + Prisma。

## 栈

- 前端：官方 OpenPencil App 壳 + 公开 `@open-pencil/*` npm（详见 `vendor/open-pencil/README.ui-manage.md`）
- API：Nitro（`server/`，`/api/*`）——唯一后端；不接官方 Cloud
- Prisma（`prisma/`，schema `ui_manage`）
- 登录复用 `harness.public.users`（Bearer token）
- `.fig` 内容存 MinIO（S3 兼容）
- MCP：`POST /mcp`（Streamable HTTP），Bearer 访问令牌 + `x-doc-id` / `x-doc-name`

## 本地开发

```bash
cp .env.example .env
pnpm install
pnpm editor:install   # bun install vendor/open-pencil
pnpm db:init
pnpm dev
```

- 前端：http://127.0.0.1:5173/（Vite proxy `/api` → Nitro）
- API：http://127.0.0.1:3001/

默认账号：`demo` / `123456`

## 鉴权

- `POST /api/auth/login` → `{ token, user }`
- 请求头：`Authorization: Bearer <token>`
- token 存 `localStorage`（`ui_manage_token`）

## 访问令牌与 MCP

- 登录后打开 `/tokens` 创建访问令牌（明文只显示一次）
- MCP：`Authorization: Bearer <访问令牌>`，并带 `x-doc-id`（UUID）、`x-doc-name`
- 设计稿不存在时按这两个头创建；画稿工具写回 MinIO 中的 `.fig`
