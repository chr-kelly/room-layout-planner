# Room / plan 宣传短片

英语国际版 + 简体中文版，28 秒，1080 × 1920，30 FPS。文案烧录、原创音乐与点击音效，两支独立 MP4。

从项目根目录启动静态服务后，打开 `/marketing/room-plan-video/` 观看成片；`source.html` 提供可拖动时间轴的代码动画预览。

- `out/room-plan-en-1080x1920.mp4`：英语版。
- `out/room-plan-zh-CN-1080x1920.mp4`：中文版。
- `out/cover-en.jpg` / `cover-zh-CN.jpg`：各版封面。
- `out/room-plan-en.srt` / `room-plan-zh-CN.srt`：字幕文件。
- `post-copy.md`：可复制的宣传文案。
- `out/room-plan-promo-kit.zip`：可直接取用的素材包，含两支视频、两张封面、两套字幕、中英文配文与使用说明。
- `brief.md`：时间线、制作依据与功能范围。
- `verification.json`：实际最终文件检查；渲染完成后生成。

## 使用了指定仓库的哪些部分

[yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) 的 475 条完整索引已载入；制作选用的 3 个提示词全文、原作者链接与仓库 MIT 许可证留存在 `references/`。参考连续变形、精确时间函数、真实产品资源及开源项目短发布片的做法。没有使用原作者视频或音乐，不宣称这些成片由 Claude Opus 制作。

## 实际产品依据

`film.mjs` 直接读取 `src/model.js` 的 4 × 3 m 示例房间及四件家具。真实截图来自项目 `assets/readme/`，以及本次补拍的 `assets/editor-3d-zh-TW.jpg`；动画示意遵循同一尺寸和长方体 3D 功能。所有移动都是手动编辑的宣传示意，不表示自动规划、碰撞检测或照片级装修渲染。

## 重现渲染

需要 Node 20+、FFmpeg（含 libx264），以及本机可用的中英文字体。

```sh
cd marketing/room-plan-video
npm install
npm run frames
npm run render
node captions.mjs
python3 verify.py
node decoded-sheet.mjs
python3 pack.py
```

本次复用了 Codex 自带的 `@napi-rs/canvas` 0.1.100，无需再次安装。Node 渲染器的 `NODE_PATH` 指向工具提供的依赖目录。字号与字形使用 macOS Arial / Hiragino Sans GB，不把系统字体文件打包分发；其他操作系统可在 render.mjs 中登记本机字体后重新渲染。

`render.mjs` 用确定性 Canvas 逐帧输出 RGBA，通过 FFmpeg 编码为 H.264 / yuv420p / AAC，开启 faststart。`soundtrack.mjs` 用波形与固定随机种子合成 120 BPM 音轨，无网络歌曲或付费服务。浏览器 Canvas 与原生渲染共享 `film.mjs`。

本次最终验证：两支 MP4 各 840 帧完整解码通过，32 / 32 张最终关键帧已人工检查；本地播放器实际播放两种语言、确认进度前进及下载链接对应。素材包 8 / 8 项完整回读一致，ZIP 校验通过。重新渲染后应重新检查最终画面，`verify.py` 不替代人工审阅。

发布产物 `out/` 由 Git 忽略，避免把 MP4 和大量检查帧混入源代码；本地交付文件保留在该目录。它们不进入应用的 `site/` 发布包。本次没有修改应用功能、对外上传或发布，病毒传播表现尚无实测数据。
