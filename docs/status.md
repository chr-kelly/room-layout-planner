# 项目状态

更新日期：2026-10-02（Asia/Shanghai）。本次范围：保留原 PRD 功能，完成六语言改造与 GitHub 介绍。用户已授权自主推进；未授权公开发布。

## 需求和决策

- 原始 PRD：用户提供的 DOCX 已完整读取，190 / 190 个非空段落、5 / 5 个表格、0 张内嵌图片。原文归档在 [source/prd-v0.1.md](source/prd-v0.1.md)。保留 F01–F12 与全部尺寸、文件和数据上限。
- 增量依据：[prd.md](prd.md)、[ux.md](ux.md)、[plan.md](plan.md)。语言为 English、繁體中文、日本語、Deutsch、Français、Español；英文走根路径，中文使用 zh-TW。
- 纯静态、同一编辑器、同一项目数据；一个紧凑语言菜单。语言切换不重载，不影响单位、撤销、选择或未提交输入。
- 旧文件与用户名称保持字面值。新默认名称通过可选 nameKey 标识，改名即移除标识；不从英文名称猜测用户意图。
- 语言使用本地 JS 模块，保留 connect-src 'none'，没有运行时第三方翻译请求。

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
  - 已提交：M1 10b6e7d，M2 ef80548，M3 9474a58；M4 提交记录见本地 Git 日志。没有远端或推送。

## 已有实际证据

- 本地服务：http://127.0.0.1:8000/。本次供查看的干净示例：http://localhost:8000/zh-TW/；已实见六语言与 2D → 3D → 2D。
- 本次已实际打开 /zh-TW/：静态标题、语言菜单、家具库、属性、单位、辅助标签显示繁体中文；旧存档名称 Living + working、Sofa 等按兼容规则保持原文。
- Three.js 本地依赖：python3 scripts/vendor.py --check，4 个 OK。
- 英文及中文 README 已制作原创 SVG 封面与真实 2D/3D 截图。六语言改造后的本地引用与实际渲染检查见 M3。
- README 参考读取 3 / 共 3 份选定官方材料：Excalidraw README、tldraw README、Sweet Home 3D 使用指南；未声称穷尽读取它们的全部仓库。

## 卡点及待确认决策

- 本机 Claude Code 的只读计划请求返回 Your account is on hold and can't use Claude Code.，退出码 1。因此本次增量文档及计划由 Codex 编写，未取得 Claude 独立审阅，也没有冒充其产出。用户“全权交给你”的授权下继续本地实现。
- 没有可用的 Claude Design 能力，未虚构画布链接或截图。延用现有产品布局，仅增加语言入口，没有另做 HTML UI 原型。
- 六语言文案已逐条编写并检查一致性；仍未由六种语言的母语使用者独立审校。
- 尚未进行真实 iPhone/Android、Safari/Firefox 和原 PRD 的 30 FPS 实机验收。
- 尚未创建或推送公开 GitHub 仓库，也未部署 Cloudflare Pages。

## 下一步

本次本地改造范围已完成，可直接体验繁中预览和顶部六语言菜单。若要上线，按 DEPLOYMENT.md 选择 Cloudflare Pages 项目与上传方式，公开发布前确认；真实设备、其他浏览器、母语文案与 Claude 独立审阅仍是后续验收项。

## 参考来源

- [Excalidraw README](https://github.com/excalidraw/excalidraw/blob/master/README.md)
- [tldraw README](https://github.com/tldraw/tldraw/blob/main/README.md)
- [Sweet Home 3D 使用指南](https://www.sweethome3d.com/users-guide/)
