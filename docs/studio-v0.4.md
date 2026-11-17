# Xleia Studio V0.4｜正式模型与渲染管线初版

## 前置验收与定位
V0.3 已由用户确认本地浏览器 **7/7 项通过**。V0.4 继续采用第一张夜间私人工作室概念图为美术方向，**只在开发分支 main 的独立 /studio/ 预览页**进行。
本轮目标是建立可迭代资产/材质/阴影管线，而非宣称所有家具已替换成高精度美术模型。

## 实际交付
- `public/models/studio/pendant-lamp.gltf`：可独立编辑的 **glTF 2.0** 金属吊灯，4 个三角网格/3 种材质，数据以内嵌 base64 buffer 储存。当前是自制低多边形资产，并非外包精模或照片级 GLB。
- `src/scripts/studio-assets.ts`：限定本地模型、标准 glTF 2.0 embedded buffer、FLOAT VEC3、三角形和 translation 的轻量安全加载器。以后正式多模型或 GLB/Draco/KTX2，需要经过新的资产系统设计。
- `public/textures/studio/walnut-albedo.svg`、`walnut-roughness.svg`：自制木纹颜色与粗糙度贴图，由 same-origin URL 加载，不引入外部图片或追踪。
- `src/scripts/studio-textures.ts`：WebGL2 贴图异步加载，失败回退为中性纹理。
- `src/scripts/studio-shadows.ts`：1024×1024 深度 Shadow Map，单独的阴影预渲染 pass，3×3 PCF 柔化。阴影不再只是近似接触暗角；属于实际深度图阴影。
- `src/scripts/studio-webgl.ts`：加载 glTF 三角面加入静态场景、采样独立贴图、使用 GGX / Schlick Fresnel 等微表面 BRDF 近似处理材质，再结合 Shadow Map 确认阴影。
- `scripts/verify-site.mjs`：校验本地模型、两张纹理的构建输出、glTF 内嵌 buffer 长度与 accessor 越界等关键不变量。
- `src/pages/studio/index.astro`：V0.4 预览标签与准确技术说明。

## 技术限制与清晰边界
- **尚无整屋模型 GLB、完整 HDR 环境照明、可编辑 Blender 工程、高分辨率摄影贴图、屏幕空间反射或真正的照片级后期 Bloom**。
- GGX 微表面 BRDF + 静态纹理采样属于 **PBR 方向的渲染基础**，目前没有完整 IBL、物理光度校准或环境光探针。
- Shadow Map 依赖一盏预设的高处主光投影；并非每一盏灯都投射高精度动态阴影。硬件或 framebuffer 初始化不支持时，仍保留无阴影的 WebGL 场景和完整 2D 导航。
- 新增模型完全从本地公开路径加载，其他五个热点均只指向既有站内路径，不引入私人应用 URL。
- GitHub CI 检查构建、源码和资源完整性，**不能替代真实浏览器 WebGL2 画面和光影回归**。

## Windows 浏览器验收
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
检查 `http://localhost:4321/studio/`（实际端口以 dev 输出为准）：
1. 能见到独立的金属吊灯，原室内构图及五个区域仍可辨认。
2. 主木质物件有纹理色差，金属光泽与布面区别明显，颜色不过曝。
3. 旋转视角时书架、桌面、家具在地面有由深度图投射的阴影，而不是单纯全局变暗；避免严重阴影闪烁、自阴影条纹或大片黑屏。
4. KOTO / Train Libre / Blog / Lab / About 五个热点仍能聚焦并跳转正确站内路由。
5. 拖动、缩放、重置、Escape 与返回正常。
6. 手机窄屏和 2D 回退正常；WebGL2/阴影初始化不可用时用户仍可以访问全部内容。
7. 原首页、Projects、Blog、19 篇历史文章路由正常。
8. 本地 check、build、verify:site 全部通过。

## 后续制作方向
V0.4 验收后，再引入独立的桌椅、书架、窗体等分件 glTF/GLB；补齐 UV、贴图规范、真正的 PBR 材质、更多阴影光源及性能预算。避免在原来的 25KB 程序化场景里无限堆叠几何。
