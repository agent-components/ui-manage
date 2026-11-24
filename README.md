# ui-manage

设计稿管理：OpenPencil 编辑器（`vendor/open-pencil`）+ tRPC API + Prisma。

## 栈

- 前端：官方 OpenPencil App 壳 + 公开 `@open-pencil/*` npm（详见 `vendor/open-pencil/README.ui-manage.md`）
- API：tRPC（`server/`，`/api/trpc`）——唯一后端；不接官方 Cloud
- Prisma（`prisma/`，schema `ui_manage`）
- 登录复用 `harness.public.users`（Bearer token）
- `.fig` 内容存 MinIO（S3 兼容）
- MCP：设置 `MCP_ENABLE=1` 后才有 `POST /mcp`（Streamable HTTP）。Bearer 登录令牌。画稿工具在 JSON 参数里带 `doc_id`、`doc_name`、`page_id` 或 `parent_id`

## 本地开发

```bash
cp .env.example .env
pnpm install
pnpm editor:install   # bun install vendor/open-pencil
pnpm db:init
pnpm dev
```

- 前端：http://127.0.0.1:5173/（Vite proxy `/api` → tRPC :3001）
- API：http://127.0.0.1:3001/

默认账号：`admin` / `123456`

## 鉴权

- 登录过程 `auth.login`（`/api/trpc`）→ `{ token, user }`
- 请求头：`Authorization: Bearer <token>`
- token 存 `localStorage`（`ui_manage_token`）

## 访问令牌与 MCP

- 画稿接口 `POST /api/openapi/<工具名>`，请求体是工具参数，并带 `doc_id`、`doc_name`
- 设计稿不存在时按这两个参数创建；画稿工具写回 MinIO 中的 `.fig`
- `MCP_ENABLE=1` 时额外提供 `POST /mcp`。请求头 `Authorization: Bearer <登录令牌>`。`tools/call` 的参数和 HTTP 一致
- 读页面传 `page_id`，新建图层传 `parent_id`。服务不记住当前页，也没有切换页面的工具
