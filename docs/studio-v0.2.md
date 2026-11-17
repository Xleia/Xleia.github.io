# Xleia Studio · V0.2 WebGL 场景交付说明

## 设计方向与技术定位
采用用户选中的**第一张**夜间工作室参考稿。此版本已经从 Canvas 2D 透视绘制变成原生 WebGL2 的三维几何绘制，拥有 GPU 深度测试、基本法线光照、木质表面细微变化和屏幕/台灯发光效果。

**不等于最终照片级 3D 建模**：暂未导入 GLB 模型、PBR 纹理、真实投影阴影、后期泛光或高精度人物物件。运行不依赖 npm 新增包或 CDN，之后可以在确认可用的 Three.js 版本后迁移至完整资产管线。

## 场景对象
- 主胡桃木桌面、显示器波形、台灯暖光与键盘
- 左侧技术书架、书籍与植物
- 右后方 Lab 实验设备及屏幕冷光
- 右前方 Train Libre 手机支架
- 前景沙发、地毯、留言板等私人角落
- 后墙夜景城市剪影与窗格

## 与 V0.1 保持一致的交互
- 五个站内热点：KOTO、Train Libre、Blog、Lab、About
- 预设镜头聚焦、鼠标拖动、滚轮缩放、Escape / 返回 / 重置
- 默认窄屏及 reduced-motion 2D 模式，用户可主动进入 3D
- WebGL2 不支持或上下文中断时保留完整 2D 站内导航

## 本地回归验收
1. `git status --short` 无需要保留的本地改动后，拉取 main
2. `npm.cmd ci`、`npm.cmd run check`、`npm.cmd run build`、`npm.cmd run verify:site` 均通过
3. 访问 `http://localhost:4321/studio/`，确认房间显示低多边形立体空间并有深度遮挡
4. 五个热点都能聚焦且链接对应现有站内详情
5. 拖动、缩放、返回、重置、Esc 与 2D 模式均正常
6. 手机窄屏可在 2D 模式访问项目、Blog、Lab、About
7. 原首页、19 条历史文章 URL 与项目页面均正常

## 发布边界
仅更新 GitHub main 的独立 /studio/ 预览页面。不会部署到 gh-pages、不会暴露项目私有仓库地址，不改变旧站上线设置。视觉与浏览器运行体验仍须用户在 Windows Chrome / Edge 实测。
