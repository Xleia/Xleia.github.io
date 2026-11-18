# Xleia Studio V0.6 — 模型细节、PBR 材质因子与渲染性能分级

## 目标与前置
用户已经确认 V0.5 的全部 8/8 项本地浏览器测试通过。V0.6 延续用户选中的第一张夜间工作室设计稿，增强独立家具模型细节、从 glTF 材质实际读取 PBR 参数、提供可选画质档位。只更改 main 下独立 /studio/ 预览，不替换正式首页或线上 gh-pages。

## 本次完成
- `public/models/studio/chair.gltf`：将椅子坐垫和背部软垫改为 768 顶点球面细分网格（两个节点复用几何），不再使用硬边立方体软垫。
- `src/scripts/studio-assets.ts`：将每个三角形所属 glTF 材质的 `metallicFactor` 和 `roughnessFactor` 经范围校验后送到顶点数据。此前仅以 `studioKind` 大类估算材质，不保留具体模型数值。
- `src/scripts/studio-webgl.ts`：顶点 stride 由 11 float 改为 13 float，增加 aMetallic / aRoughness，片段 Shader 使用每个资产的材质因子形成 GGX / Schlick 高光；胡桃木粗糙度贴图与基础值混合。
- 画质下拉选择：**省电**（DPR≤1、512 深度阴影）、**均衡**（DPR≤1.5、1024 深度阴影）、**高画质**（DPR≤1.75、1536 深度阴影）；设备内存/并发数较低默认采用省电档，其余默认为均衡。
- `src/scripts/studio-shadows.ts`：允许根据所选档位重建静态 Shadow Map；阴影纹理尺寸不超过 WebGL 的 MAX_TEXTURE_SIZE，模型不变时仍只重算一次。
- `scripts/verify-site.mjs`：检查 glTF 软垫细分网格、材质输出与 Shader 输入的打包协议、三档画质参数和模型完整性。
- 不新增第三方 npm 包或外部 CDN。五个热点、镜头聚焦、资源失败回退与 2D 导航继续保持。

## 重要限制
- 当前仍是原生 WebGL2 自制低多边形项目，除软垫等局部提高网格精度外，主桌面、书架和房间主体未全部替换为高精度 PBR/Blender 精模。
- GGX + 模型材质因子 + 木纹贴图是局部 PBR 基础，尚无 HDR IBL、完整法线图、真实全局光照、影视级后期。
- 渲染质量档位限制 DPR 和 Shadow Map 分辨率，但尚无实测 FPS、GPU 时间、加载耗时与内存指标，不能宣称速度提升百分比。
- 自动 CI 对源码、路由和 glTF 数据进行验证，不会在用户浏览器上编译 GPU Shader。实际视觉、帧率和高低档效果需 Windows Chrome/Edge 实测。

## 本地验收
在 VS Code PowerShell：
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
浏览器打开 `http://localhost:4321/studio/`：
- [ ] 椅子坐垫、靠垫边缘更加圆润，书桌、书架和原有房间结构保持正常。
- [ ] 木质、金属与布艺区别仍清晰，材质不过曝，Shadow Map 阴影不闪烁。
- [ ] 画质选择「省电/均衡/高画质」能切换，画面没有黑屏或 WebGL 错误。
- [ ] 相机旋转、聚焦和缩放时灯光与模型稳定，五个热点及站内链接可用。
- [ ] 2D/移动端降级正常，切换画质不影响 2D 内容访问。
- [ ] 主页、项目页、Blog、19 篇历史文章原 URL 未受影响。
- [ ] `npm.cmd run check`、`npm.cmd run build`、`npm.cmd run verify:site` 通过。

## 后续建议
在 V0.6 本地验收完成后，对多种硬件采集真实帧率/启动时间和 GPU 负载，设计相机遮挡剔除与分档 LOD；有授权精模资源后逐个替换桌面、书架和窗体。先保证网站浏览与导航稳定，再增加后期效果。
