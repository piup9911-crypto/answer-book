# 阿祈的答案之书

部署在 [`answer-book.naginoumi.com`](https://answer-book.naginoumi.com/) 的独立互动答案之书，答案数据来自 `public/data/aqi-answer-book.json`，目前共 412 条。

## 当前项目状态

- 生产主版使用 CSS 书体与 DOM 文字，优先保证纸面细节、文字清晰度和手机端性能。
- 答案使用 `crypto.getRandomValues()` 等概率抽取，允许自然重复。
- 滑动模式支持页数进度条：拖动时逐页翻动，点击时翻动一叠厚页。
- 项目由 Cloudflare Worker Static Assets 部署，自定义域名为 `answer-book.naginoumi.com`。
- Three.js 3D 实验保存在 `codex/three-experiment` 分支，并发布在独立预览地址：
  [`three-experiment-aqi-answer-book.piup9911.workers.dev`](https://three-experiment-aqi-answer-book.piup9911.workers.dev/)
- Three.js 实验验证了实时柔性翻页，但当前存在材质偏旧、近距离网格感明显、动态文字纹理不够清晰等问题，因此没有作为生产主版。

## 后期视觉优化方向

后期将根据效果测试，在以下两种路线中选择其一，或组合使用：

### 方案一：Blender 预渲染序列

- 在 Blender 中完成书本建模、纸张材质、灯光、接触阴影和翻页动画。
- 输出视频、WebP/AVIF 序列或精灵图，由网页手势和进度条控制播放帧。
- 优点是最接近 Blender 最终渲染质量，没有实时低模网格感。
- 适合固定镜头下的封面开启、单页翻动和薄／中／厚页叠动画。

### 方案三：Blender 与网页混合

- 静止书本和重要翻页阶段使用 Blender 渲染素材。
- 网页继续负责完全随机、412 条动态答案、进度条和清晰文字。
- 翻页过程中隐藏文字，书页停稳后再由 DOM 文字贴合纸面浮现。
- 可以保留 CSS 主版的清晰交互，同时获得 Blender 的材质与光影质感。

在新方案达到目标前，生产主版与各实验预览应并行保留，不直接互相覆盖。

## 当前交互

- 电脑与手机：轻点闭合书封随机打开；轻点摊开的书合上；再次轻点书封重新随机打开。
- 电脑使用鼠标、手机使用手指在闭合书封上从右向左拖动，进入滑动翻页模式，并从第 `000` 页开始。
- 滑动模式中可拖动页数轨道连续逐页翻动，或点击轨道翻动一叠厚页。
- 两种模式的答案都在原位由模糊到清晰浮现，不产生上下位移。

## 本地运行

```powershell
npm install
npm run dev
```

## 检查与部署

```powershell
npm run check
npm run deploy:dry-run
npm run deploy
```
