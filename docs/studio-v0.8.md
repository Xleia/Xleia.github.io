# Xleia Studio V0.8 — GPU 非阻塞计时与夜间美术细化

## 已有实测基准（V0.7）
用户在 Windows 浏览器确认 V0.7 **8/8 本地验收通过**，实测以下数值：

| 画质档 | rAF FPS | CPU 绘制均值 |
| --- | ---: | ---: |
| 省电 | 60.0 | 0.12 ms |
| 均衡 | 60.0 | 0.13 ms |
| 高画质 | 60.0 | 0.09 ms |

三档 FPS 均达 60，不能凭此判断 GPU 不受限。60 FPS 可能是显示刷新率或垂直同步上限；样本中的 CPU 0.09–0.13 ms 差别不足以判定档位性能优劣。没有 GPU 帧耗时、功率或其他设备的基准。

## V0.8 的实际工作
- `src/scripts/studio-gpu-timer.ts`：按需使用 `EXT_disjoint_timer_query_webgl2` 采集 GPU elapsed-time；无扩展时优雅降级，不进行 GPU 时间猜测。最多保持 8 个未读取查询，通过 `QUERY_RESULT_AVAILABLE` 非阻塞轮询，监测 DISJOINT 并丢弃无效样本。
- `src/scripts/studio-webgl.ts`：在 5 秒活动采样期间为 Shadow Map / 主场景绘制包裹 GPU 查询，报告已完成 GPU 样本均值、待完成样本标识；同时记录模型网络下载与解析至可建场景前的耗时。
- `src/scripts/studio-webgl.ts`：加入轻量家具和空间装饰，如胡桃木桌沿暖色灯带、Lab 青色下照灯、夜景墙木饰条、私人角落小圆桌及装饰画，不改变五个交互区域及摄像机协议。
- `src/pages/studio/index.astro`：标记 V0.8，说明 GPU 计时依赖扩展；无扩展时照常报告 rAF/CPU。
- `scripts/verify-site.mjs`：静态保护 GPU 查询的可用性检查、回调关闭、读取时机，以及夜间材质装饰存在性。

## 当前边界
- **真正 GPU 耗时**需要浏览器显卡驱动支持计时扩展，且异步查询有可能在 5 秒采样结束时尚未全部完成。只报告有效完成的样本，不代表全部帧的 GPU 统计；不进行强制同步读取。
- `performance.now()` 用于 JavaScript CPU 绘制时长，不等于 GPU；`requestAnimationFrame` 只是活动帧调度率，可能受到刷新率上限影响。
- 下载+解析时间包含多个并行 glTF 的网络与解析，不是浏览器 `LCP`、`FCP` 或全站完成加载时间，不能直接与网页性能指标混淆。
- V0.8 的视觉改进属于程序化低多边形细节追加，尚不是高精度 Blender/GLB、HDR IBL、影视级阴影/泛光。没有任何性能提升百分比的有效实测证据。
- 不增加第三方依赖和外部通信，不更改生产 `gh-pages` 或旧站备份。

## Windows 本地验收
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

访问 `http://localhost:4321/studio/`：
1. 五个热点、书桌/椅/书架、LOD 切换、三档画质、2D 回退仍正常。
2. 木质灯带、Lab 灯条、墙面木饰条与个人角落装饰可辨认，画面没有过曝或异常阴影。
3. 点击测量 5 秒 FPS 后，得到 CPU/rAF 和模型加载耗时；若驱动支持 GPU 计时扩展，显示 GPU 已完成样本均值与样本数。若不支持，明确显示「GPU 计时扩展不可用」。
4. 测试完成后恢复按需绘制，关闭页面释放 GPU 资源；切换至 2D 或后台时不误报 GPU 时间。
5. 原首页、Projects、Blog 和 19 篇历史文章继续正常。
6. check、build、verify:site 本地全部通过。

## 下一轮决策
用户提供 V0.8 三档数据和截图后，先比较 GPU 延迟、资源加载耗时和画质。若仍呈现刷新率封顶且 GPU 时间相对较低，优先增强空间层次、灯光、家具外观；如果 GPU 帧时长接近显示帧预算，再优化光照采样、纹理分辨率与 LOD 策略。
