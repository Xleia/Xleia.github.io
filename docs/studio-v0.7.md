# Xleia Studio V0.7 — 活动帧率测量、家具 LOD、布艺纹理

## 验收前提
V0.6 用户明确确认本地 7/7 项通过。V0.7 继续在独立 `/studio/` 预览，不修改正式首页或生产 `gh-pages`。视觉继续以第一张夜间私人工作室设计稿为参考。

## 已实现
- 新增 `desk-low.gltf`、`bookshelf-low.gltf`、`chair-low.gltf`：减少小型模型节点，模型节点由 16/60/19 分别减少到 9/26/7。保留外轮廓主结构和独立材质。
- 原有高、低两套模型启动时按当前资产加载器要求校验。加载失败时优先保留高细节模型或旧程序化家具。
- V0.7 相机距离和所选画质驱动 LOD，使用距离阈值迟滞避免边界频繁切换；LOD 切换时更新 WebGL 静态顶点缓存并重新生成 Shadow Map，日常相机移动继续复用缓存。
- `/studio/` 页面增加「测量 5 秒 FPS」；仅在用户点击后连续运行 `requestAnimationFrame` 测量活动绘制帧数与 `performance.now()` 主线程绘制时间（均值、P95）。
- 新增同源 `fabric-albedo.svg` / `fabric-roughness.svg`，在布艺材质 Shader 中采样，使布艺颜色与微表面粗糙度更细致。
- 新增构建检查：三件家具 LOD 文件存在并少于原版节点、贴图安全性、LOD 缓冲协议与性能测量 UI 接口。

## 性能数据解释
- 页面原本使用**按需渲染**：静止时没有持续重绘。因此“静止 FPS”没有实际意义，V0.7 提供主动 5 秒样本。
- rAF FPS 表示浏览器动画帧调度/提交速率；并非独立测量的 GPU FPS，也不是最终显示器端到端延迟。
- 主线程 CPU 绘制时长只统计 JS `redraw()` 周边调用耗时，**不包含 GPU 异步执行的全部时间**。
- 未访问用户本地显卡，尚无真实基准值，更不能声称优化百分比。
- 画质（像素比例、Shadow Map）保留 V0.6 三档设置。LOD 为预定义高/低资源切换，并非通用网格简化或纹理压缩算法。

## 验收步骤
```powershell
cd C:\dev\workspace\xleia-site-astro
git status --short
git pull --ff-only origin main
npm.cmd ci
npm.cmd run check
npm.cmd run build
npm.cmd run verify:site
npm.cmd run dev
```
打开 `http://localhost:4321/studio/`（实际端口以输出为准）：
1. 五个热点、桌面、书架、座椅、吊灯都正常显示。
2. 改为省电画质或拉远镜头，家具仍有基本造型，恢复近景时细节重新出现且不闪烁、错位。
3. 三档画质切换没有黑屏，阴影不重复闪烁，移动端 2D 降级保持可用。
4. 布艺的纹理/粗糙度效果正常，无异常高光、材质黑块。
5. 点击「测量 5 秒 FPS」，约 5 秒后得到 rAF FPS 和 CPU 绘制均值、P95；无外部日志上传。
6. 测量结束不再持续绘制；页面切到后台或 2D 时采样被中止。
7. 原首页、项目及 19 篇历史博客正常；本地 check/build/verify:site 全部通过。

## 技术限制与后续
所有家具仍为自制轻量 glTF，未制作照片级 GLB 或 Blender 工程。Shader 未采用完整环境 HDR IBL、法线贴图、多光源阴影或影视级后处理。待用户提供省电、均衡、高画质三个档位的真实测量结果，再为 V0.8 设计 FPS/CPU 预算、可见性剔除及更精细的家具模型。
