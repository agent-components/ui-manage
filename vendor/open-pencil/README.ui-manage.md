# ui-manage OpenPencil embed

## 模型

- **App**：官方 `v0.17.0-beta.2` 壳（含 `/login` → `/designs` → 编辑器）
- **库**：公开 npm `@open-pencil/*@0.17.0-beta.2`（`canvaskit@0.16.0`）
- **本地洞**：`shims/`（含 `@open-pencil/collab` stub；多人协作已去掉）
- **后端**：只走仓库根目录 `server/` + `prisma/`（Vite proxy `/api` → Nitro `:3001`）
- **不接入**官方 Cloud / `@open-pencil/cloud` 运行时（`VITE_OPENPENCIL_CLOUD=off`）

## 启动

```bash
pnpm editor:install
pnpm dev          # api=nitro:3001 + web=vite:5173
```

## 已裁能力

- 无 CLI / docs / demos / desktop（Tauri）/ tools
- 无内置 AI chat / AI Setup / Models 设置页（`src/app/ai/*` 多为 stub；runtime 导出保留以免 boot 炸）
- 无 feedback / donation / usage / voice-call / cloud-portal UI；feedback/harness 走 stub
- Settings 仅保留 通用 / 编辑器 / 字体（无通知、隐私、诊断、存储配置；对象存储由服务端写死 + 目录隔离）
- 无 FigJam 属性面板与选区工具条 / Mermaid 粘贴 / DrawIO 导出（固定网页 design）
- 无官方 agent MCP（`@open-pencil/mcp` 已卸）；**后续对外 MCP 在 `server/` 自建 Web 接口**，可参考官方 mcp 参数，本轮不实现
- 打开/保存设计稿：`integrations/ui-manage` → `/api/designs/:id/content`

## 安装与跑 Vite

- 安装：`bun install`（根脚本 `pnpm editor:install`）；`postinstall` 会把 `@open-pencil/canvaskit` 的 `canvaskit.wasm` 拷到 `public/`（默认 locator 是 `/canvaskit.wasm`）
- 开发：`OPENPENCIL_UI_MANAGE=1 VITE_OPENPENCIL_CLOUD=off npx vite`（勿用 `bunx --bun vite`）
- 画布空白但图层面板有图层：多半是 CanvasKit JS/wasm 未配对或 `/canvaskit.wasm` 被 SPA 回成 HTML；硬刷新后再试
