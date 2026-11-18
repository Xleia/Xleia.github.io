# Xleia Studio V0.5 — 模块化家具模型与性能改进

## 实施目标
延续用户选中的第一张夜间私人工作室设计稿，基于 V0.4 已可初始化的 WebGL2 渲染管线，把硬编码家具逐步替换为可独立管理的 3D 模型，同时保持原有五个热点、镜头交互、2D 备用导航与生产站点隔离。

## 本次已实现
- `public/models/studio/desk.gltf`：分层胡桃木桌面、桌腿、抽屉与金属把手。
- `public/models/studio/bookshelf.gltf`：书架木板、支撑结构、技术书与横放笔记。
- `public/models/studio/chair.gltf`：椅座、靠背、扶手、靠垫、支柱与脚轮。
- `src/scripts/studio-assets.ts`：支持同源嵌入式 glTF 2.0、模型复用、Node TRS（平移、比例、Quaternion 旋转）与顶点/变换/数据大小校验。仍仅支持非索引 FLOAT VEC3 三角形，不是通用 GLB 引擎。
- `src/scripts/studio-webgl.ts`：单独加载四项资产（新三件家具和已有吊灯），仅当对应家具加载成功时移除它的旧程序化体块，其他细节和热点继续保留；部分加载失败自动保留相关旧几何，避免整个场景缺失。
- 静态 Shadow Map 缓存：场景顶点固定后生成一次阴影贴图；相机旋转、缩放和聚焦不再对同一批静态 Mesh 重复生成阴影。
- `scripts/verify-site.mjs`：添加三个模型的构建输出、缓冲区、安全变换、节点数量、材质类型和回退范围检查。
- `src/pages/studio/index.astro`：显示 V0.5 与实际资产加载状态。

## 限制
- 三套家具是自行制作的**低多边形 glTF 2.0 模型**，没有使用未经授权的外部资产，也不是照片级高精度 GLB / Blender 工程。
- 资产复用针对当前四个模型进行；更复杂的 glTF 索引网格、外部纹理、骨骼、动画、HDR/IBL 仍属后续范围。
- 现有 GGX 光照、木质颜色与粗糙度纹理、主光 Shadow Map 继续沿用 V0.4，并未宣称达到完整电影级 PBR。
- GitHub CI 不能在用户 Windows GPU 上验证 Shader 和画面，仍需要实际视觉验收。
- 不修改 `gh-pages` 及旧站备份；`/studio/` 仍是独立开发预览路径。

## 浏览器验收
在 PowerShell 中：
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
打开 `http://localhost:4321/studio/`：
1. 资源状态显示 **独立家具 3/3**，桌面、书架与椅子具有新造型，没有双层叠加或消失。
2. 灯光、材质、阴影正常，无黑屏、Shader 编译错误和严重阴影条纹。
3. 五个交互热点全部可用，链接依旧指向 KOTO、Train Libre、Blog、Lab、About。
4. 拖动、缩放、镜头聚焦、重置、返回与 Escape 正常。
5. 2D 回退、窄屏及 WebGL 不支持时的导航可用。
6. 原网站首页、项目页与 19 篇博客文章正常。
7. check、build、verify:site 本地成功。
8. 可选：在 Network 中屏蔽某个家具 .gltf 文件，确认该物件旧程序化模型会保留。

## 后续优先级
确认资产加载和造型后，进一步制作高细节 GLB、UV 贴图、纹理压缩和性能预算，并增加浏览器 GPU 渲染的自动化截图/Shader 编译验证，防止只靠 TypeScript CI 漏检 WebGL 错误。
