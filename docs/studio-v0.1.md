# Xleia Studio · V0.1 空间原型

## 设计参照
以 2026-11-17 第一张夜间工作室视觉稿为美术方向：主桌面居中、左后方书架、右侧 Lab、手机支架、私人角落；暖色台灯与冷色屏幕光混合。V0.1 **只是透视几何白模**，不是照片级渲染，也不是可编辑 GLB/Three.js 模型。

## 验证入口
- 在 Astro 本地运行时访问 `http://localhost:4321/studio/`
- 该页面使用独立的 `src/pages/studio/index.astro`，不替换正式首页
- 使用现有站内项目链接，不包含私有服务或未经审核的外部下载地址

## 设计映射
| 物件 | 路由 |
| --- | --- |
| 主显示器 / KOTO | `/projects/koto/` |
| 手机 / Train Libre 中文版 | `/projects/train-libre/` |
| 书架 / Blog | `/blog/` |
| 实验台 / Lab | `/lab/` |
| 私人角落 / About | `/about/` |

## 浏览器检查
1. 桌面默认出现夜间工作室透视构图，主桌面、书架、Lab、手机、About 可以辨认。
2. 五个热点均可点击；分别聚焦并出现对应说明和站内链接。
3. 「返回工作室」及「重置视角」能回到默认构图；`Escape` 可以收起面板。
4. 拖动可限制旋转，滚轮可限制缩放。
5. 切换到 2D 模式后五个站内导航仍然可用。
6. 760px 以下与减少动画设置默认使用 2D 模式，可主动进入 3D 原型。
7. 深浅色主站主题、Header/Footer、Blog 文章和历史 URL 不受影响。
8. `npm.cmd run check`、`npm.cmd run build`、`npm.cmd run verify:site` 成功。

## 安全与发布边界
- 本阶段不引入新增 npm 依赖、外部图片素材、性能监控或跟踪脚本。
- 3D 白模由浏览器 Canvas 2D 透视绘制。正式制作阶段再决定 Three.js/WebGL、GLB 模型、灯光与资源加载。
- 不修改 `gh-pages` 线上分支；仅由 `main` 生成开发预览。
- 暂不把 /studio/ 链接加入正式首页导航，待本地视觉认可后再评审。
