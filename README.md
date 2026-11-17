# Xleia Personal Site

个人开发者网站重构工程：Astro + React + TypeScript。

> **P1 初始工程**。生产网站仍由 `gh-pages` 分支的 `/ (root)` 发布。
> 此分支不包含 GitHub Pages 部署动作；**不要**在迁移完成前切换 Pages Source。

## 环境

- Node.js 22.23.4 或更高的受支持版本
- npm（不要求 pnpm）

## 本地启动

```bash
npm install
npm run check
npm run build
npm run dev
```

打开 Astro 终端输出的本地开发地址，点击首页的 React 交互测试按钮。

初始提交不包含 `package-lock.json`：请在第一次成功运行 `npm install` 后将自动生成的锁文件提交到 `main`，然后把验证工作流中的 `npm install` 改为 `npm ci`。**不要**手工伪造锁文件。

## 分支与部署安全

- `main`：新 Astro 源代码；目前不发布到线上
- `gh-pages`：线上 Hexo/Fluid 旧站；不得被 P1 操作覆盖
- `backup/hexo-2026-11-17`：旧站固定快照
- 正式网站 URL：https://xleia.github.io/

详见 Notion 中的 P0 审计和重构计划。后续 P2 实现完整主页与项目展示，P3 迁移旧文章及 URL，P4 建立 Lab。
