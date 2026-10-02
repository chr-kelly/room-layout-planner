# 项目状态

更新日期：2026-10-02（Asia/Shanghai）。本次范围：保留原 PRD 功能，完成六语言改造、GitHub 介绍，以及用户追加的英语国际版和中文版竖屏宣传片。用户已授权自主推进；未授权公开发布。

## 需求和决策

- 原始 PRD：用户提供的 DOCX 已完整读取，190 / 190 个非空段落、5 / 5 个表格、0 张内嵌图片。原文归档在 [source/prd-v0.1.md](source/prd-v0.1.md)。保留 F01–F12 与全部尺寸、文件和数据上限。
- 增量依据：[prd.md](prd.md)、[ux.md](ux.md)、[plan.md](plan.md)。语言为 English、繁體中文、日本語、Deutsch、Français、Español；英文走根路径，中文使用 zh-TW。
- 纯静态、同一编辑器、同一项目数据；一个紧凑语言菜单。语言切换不重载，不影响单位、撤销、选择或未提交输入。
- 旧文件与用户名称保持字面值。新默认名称通过可选 nameKey 标识，改名即移除标识；不从英文名称猜测用户意图。
- 语言使用本地 JS 模块，保留 connect-src 'none'，没有运行时第三方翻译请求。
- 宣传片语言与画幅已由用户确认：英语国际版＋中文版，9:16 竖屏；中文广告使用简体，真实产品界面仍为繁中。制作参考用户指定的 awesome-opus5-5-videos 仓库，保留来源和许可证。

## 里程碑

- [x] M1：原需求基线、333 条文案 × 6 套语言包、稳定消息与错误参数、语言偏好和默认名称兼容结构。
  - 红测试：新增多语言测试首次运行返回 ERR_MODULE_NOT_FOUND（i18n 模块尚未建立），退出码 1。
  - 绿测试：原 55 项 + 新增 6 项，实际输出 tests 61 / pass 61 / fail 0 / skipped 0，退出码 0。
  - 本地 Git 基线提交：d1e89f8；该目录此前不含 Git 元数据。没有远端或推送。
- [x] M2：编辑器、弹窗、帮助、Canvas/PNG、错误和辅助标签全部接入；保留草稿、撤销、选择、旧存档和用户名称。
  - 实际验证：Node tests 64 / pass 64 / fail 0 / skipped 0；Chromium 浏览器 passed 39 / failed 0，退出码均为 0。原 55 项单元测试、22 项浏览器场景完整保留并通过。
  - 修复实际红测试：校准点按图像像素取整，保持原 400 px / 4 m 的精确断言；仅给动态消息绑定更新，避免换语言时清空家具卡片；语言地址切换前固定同源链接，避免相对资源基址漂移。
  - 六语言覆盖未提交输入、JSON/PNG、3D、数字逗号、存储拒绝和依赖失败；390 × 844 手机为模拟视口。
- [x] M3：六个静态入口、共享资源、子路径支持、发布脚本和 GitHub 中英文介绍完成。
  - 实际发布包输出：PASS: 30 app-only files in site/; 6 language entries; no docs, tests, .env or Git data.
  - 静态入口测试通过；浏览器实际验证 /site/ 子目录的资源、语言切换和刷新。没有 /en/ 路径。
  - README 两份共 39 个本地文件引用检查通过（不含外部链接和页内锚点）；6 个折叠区、6 张图片引用、6 个表格。英文及中文实际渲染各有 3 / 3 图片加载成功、3 个表格、3 个折叠区，无横向溢出。
  - 封面和最新版真实 2D / 3D 截图已保存在 assets/readme/。部署配置和步骤见 DEPLOYMENT.md。
- [x] M4：原浏览器套件与新增六语言桌面/手机回归全部通过，截图、完整输出及最终记录已归档。
  - 环境：macOS arm64，Node v22.17.0，Python 3.9.6，Playwright 1.57.0，Chromium 143.0.7499.4（headless）。桌面 1366 × 900，模拟手机 390 × 844。
  - 实际输出：64 单元测试通过、0 失败、0 跳过；39 浏览器场景通过、0 失败。全部 15 个 JS 模块与 3 个 Python 脚本语法检查通过；Four Three.js vendor files OK。
  - 18 个六语言 PNG 文件已生成；12 / 12 张六语言桌面及手机截图已人工检查布局。最新版真实英文 2D、3D、繁中 2D 截图已检查，预览控制台 errors/warnings = []。
  - 完整证据：[unit-results.tap](unit-results.tap)、[browser-results.json](browser-results.json)、[TESTING.md](TESTING.md)、[RELEASE_STATUS.json](RELEASE_STATUS.json)。没有删除、跳过或放宽原测试。
  - 已提交：M1 10b6e7d，M2 ef80548，M3 9474a58，M4 8db0f74。没有远端或推送。
- [x] M5：英语国际版＋中文版宣传片、封面、字幕、发布配文、播放器与完整素材包。
  - 指定仓库固定版本 3d54892e2ae5b0e8d337171e6508bba4cec01ab8；475 / 475 条完整索引载入，制作选用的 3 / 3 个提示词全文读取并归档。未观看或使用原作者视频，没有冒称 Claude Opus 制作。原始提示词和 MIT 许可证见 ../marketing/room-plan-video/references/。
  - 内容：开场“又要挪沙发？”、真实尺寸、手动拖动与旋转、同一布局 2D → 3D、六语言、真实编辑器、转给准备搬家的朋友。采用实际示例数据与真实截图，原创 120 BPM 音轨与音效；无虚构上线地址或功能。
  - 实际完整文件输出：PASS en: 1080x1920, 30fps, 28s, 840 decoded frames, H.264 + AAC; 2.06 MiB；PASS zh-CN: 同规格；2.07 MiB。两支完整 MP4 解码退出码 0，faststart 通过，音轨峰值 -5.7 dB。
  - 两张最终解码联系表共 32 / 32 个关键帧已人工查看，检查中英文文字、尺寸、3D、六语言及实际编辑器截图；没有缺字或标题截断。浏览器实际播放中文版 0.019447 → 21.280534 s、英语版 0.249710 → 26.136917 s，均未出现媒体错误；语言切换后的 MP4 与封面链接对应。
  - 素材包实际输出：PASS: 8 / 8 ZIP entries match the deliverables; CRC check passed; 4.20 MiB。含两 MP4、两封面、两 SRT、中英文配文与中文使用说明。
  - 源码语法实际输出：PASS: 8 JavaScript modules and 2 Python scripts pass syntax checks。提交前确认 .gitignore 已排除 .env、node_modules、site/、宣传 out/；播放器已展示并保留，最终界面截图归档在 out/player-preview.png。
  - 完整证据：[verification.json](../marketing/room-plan-video/verification.json)；源码与重现步骤：[README.md](../marketing/room-plan-video/README.md)；分镜与来源：[brief.md](../marketing/room-plan-video/brief.md)。成片位于该目录 out/，保留本地、由 Git 忽略。没有改动应用模块，因此未重复运行 M4 已通过的应用回归。
- [x] M6：按用户反馈，将中英文 README 改为纯 Markdown，便于直接阅读和编辑。
  - 标题、导航、图片均使用 Markdown；三处 HTML 折叠区改为普通小标题。完整功能、尺寸边界、安装、部署、语言、贡献与许可证说明保留，英文和中文同步修改。
  - 实际输出：PASS README.md: 0 HTML tags; 3 Markdown images; 3 ordinary subsection headings；README.zh-CN.md 同样通过。PASS: 39 local file references exist; 6 image references retained; code fences paired。git diff --check 退出码 0。
  - 仅修改两份 README 与本状态记录，不改变应用、宣传视频或原有测试；因此未重复运行应用回归。已请求在 Codex 中显示新版中文 README；应用返回 queued，未把排队状态当作已经打开。

## 已有实际证据

- 本地服务：http://127.0.0.1:8000/。本次供查看的干净示例：http://localhost:8000/zh-TW/；已实见六语言与 2D → 3D → 2D。
- 本次已实际打开 /zh-TW/：静态标题、语言菜单、家具库、属性、单位、辅助标签显示繁体中文；旧存档名称 Living + working、Sofa 等按兼容规则保持原文。
- Three.js 本地依赖：python3 scripts/vendor.py --check，4 个 OK。
- 英文及中文 README 已制作原创 SVG 封面与真实 2D/3D 截图。六语言改造后的本地引用与实际渲染检查见 M3。
- README 参考读取 3 / 共 3 份选定官方材料：Excalidraw README、tldraw README、Sweet Home 3D 使用指南；未声称穷尽读取它们的全部仓库。
- 宣传成片播放器：http://localhost:8000/marketing/room-plan-video/；可切换中英文、下载 MP4 和素材包。完整成片已解码、检查关键帧，并实测本地播放。

## 卡点及待确认决策

- 本机 Claude Code 的只读计划请求返回 Your account is on hold and can't use Claude Code.，退出码 1。因此本次增量文档及计划由 Codex 编写，未取得 Claude 独立审阅，也没有冒充其产出。用户“全权交给你”的授权下继续本地实现。
- 没有可用的 Claude Design 能力，未虚构画布链接或截图。延用现有产品布局，仅增加语言入口，没有另做 HTML UI 原型。
- 六语言文案已逐条编写并检查一致性；仍未由六种语言的母语使用者独立审校。
- 尚未进行真实 iPhone/Android、Safari/Firefox 和原 PRD 的 30 FPS 实机验收。
- 尚未创建或推送公开 GitHub 仓库，也未部署 Cloudflare Pages。
- 宣传素材已本地完成，尚未对外上传或发布，也没有病毒传播或转化效果数据。发布配文的产品网址需在项目实际上线后替换。

## 下一步

本次本地改造及宣传片已完成，可直接体验繁中预览，或打开宣传成片播放器查看两版视频并下载素材包。项目上线后把发布配文中的网址补齐即可使用；公开发布前确认。真实设备、其他浏览器、母语文案与 Claude 独立审阅仍是后续验收项。

## 参考来源

- [Excalidraw README](https://github.com/excalidraw/excalidraw/blob/master/README.md)
- [tldraw README](https://github.com/tldraw/tldraw/blob/main/README.md)
- [Sweet Home 3D 使用指南](https://www.sweethome3d.com/users-guide/)
- [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos)
