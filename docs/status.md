# 项目状态

更新日期：2026-10-01（Asia/Shanghai）。本次范围：多语言改造讨论、GitHub 介绍文档。

## 已完成

- [x] 本地静态预览：`http://127.0.0.1:8000/`。真实显示示例房间，并成功从 2D 切换到 3D、再返回 2D。
- [x] Three.js 本机依赖已下载。此前 `python3 scripts/vendor.py --check` 输出 4 个 `OK`。
- [x] 对照 3 个项目的 3 份选定官方介绍，已读 3 / 共 3：Excalidraw README、tldraw README、Sweet Home 3D 使用指南。未对这些项目的完整代码仓库或全部文档作穷尽调研。
- [x] 英文 `README.md` 与现有中文 `README.zh-CN.md` 已同步整理：原创封面、真实 2D/3D 截图、功能表、三步使用方法、可折叠细节、隐私、托管、开发与许可证说明。
- [x] 用户已选定首版 6 种语言：`en`、`zh-TW`、`ja`、`de`、`fr`、`es`。

## 实际验证

- 文档检查输出：`PASS 35 local README links/assets; 6 collapsible sections; SVG XML; 2 JPEG files`。
- 两份 README 均已用 MarkdownIt 渲染，各生成 2 个表格。
- 中文本地渲染预览：`http://127.0.0.1:8000/test-results/readme-preview.html`。
- 浏览器读取结果：3 / 3 张图片 `loaded: true`；`horizontalOverflow: false`；快速开始锚点存在。
- 本地 3D 查看时读取的控制台警告/错误数组为 `[]`。
- 截图：`assets/readme/editor-2d.jpg`、`assets/readme/editor-3d.jpg`；README 渲染截图为 `test-results/readme-preview.jpg`。
- 这是当前浏览器的局部运行与文档验证。本次未重跑完整单元/浏览器套件，也未进行真实手机或所有浏览器验收；原测试记录仍见 `TESTING.md`。

## 多语言改造建议（待确认方案，尚未实现）

1. 保留纯静态、无应用构建的架构。6 种语言共用一个编辑器和同一套几何、保存、导入导出逻辑。
2. 顶部增加一个语言菜单，使用语言自称：English、繁體中文、日本語、Deutsch、Français、Español。手机仍使用现有底部面板，语言入口保持紧凑。
3. 英文使用根路径 `/`，其他语言使用 `/zh-TW/`、`/ja/`、`/de/`、`/fr/`、`/es/`。欢迎界面可按浏览器语言提供建议；用户选择应记住。具体自动推荐交互待确认，根路径保持可明确访问的英文页面。
4. 语言切换只更新界面和地址，不重新载入、替换或缩放方案，也不清空选择、撤销历史或正在编辑的输入。所有语言共享原有项目存储键，语言偏好另存；存储失败也允许本次会话继续切换。
5. 按功能提取文案：静态标题/按钮、动态属性和弹窗、加载/成功/错误状态、帮助、可访问标签、2D 画布以及 PNG 导出。翻译不得仅覆盖首页。
6. 当前 CSP 为 `connect-src 'none'`，直接 `fetch` JSON 语言包会被阻止。建议采用本地 JavaScript 语言模块，在现有 `script-src 'self'` 范围内加载，保持无需运行时第三方请求；不以放宽安全策略来加载翻译。
7. 核心校验通过稳定错误码和参数表达，界面翻译成人话；不要通过匹配英文错误句子替换，或把翻译逻辑耦合到几何计算。
8. 区分预设标签与用户名称。新默认名称可以随语言显示；用户改名、自定义名称和原有 JSON 名称应保留原文。不能凭“名称恰好等于 Desk”等英文字符串判断用户是否改过名。
9. 公制/英制独立于语言。内部仍用米存储；显示可按语言格式化数字，输入须正确处理对应的小数格式。六种语言使用同一批已知尺寸验收。
10. 德法西较长文案需要实测桌面和手机；按钮短文案、布局弹性、可访问的完整描述，以及画布按实际文字宽度排版共同保证简洁。现有功能、页面和家具预设均保留。
11. 六套语言包采用同一组文案键，逐语言检查缺失文案、变量、错误路径、表单、画布和导出；旧版 JSON、用户名称、几何和历史须有跨语言回归验证。逐语言审校，不能用机器翻译结果直接视为完成。

## 下一步和卡点

- [ ] 确认上述多语言交互方案，然后按用户约定由 Claude 补齐需求/交互说明和实现计划，再由 Codex 执行。
- [ ] 本目录没有原始 PRD 或实现计划，仅文档提到上传过的 PRD；目前不重写旧 PRD。正式更新时需要关联原文，或由用户确认以本次增量需求为依据。
- [ ] 多语言应用代码尚未改动；README 已明确标注当前界面仍为英语、6 种语言处于方案阶段。
- [ ] 当前目录没有 `.git`，未创建、关联、提交或推送 GitHub 仓库。
- [ ] 尚未公开部署 Cloudflare Pages 或 GitHub Pages。

## 参考来源

- [Excalidraw README](https://github.com/excalidraw/excalidraw/blob/master/README.md)：封面、真实效果图、简短定位、快速开始与翻译贡献入口。
- [tldraw README](https://github.com/tldraw/tldraw/blob/main/README.md)：清楚的首屏层次、少量入口与文档分层。本次借鉴呈现方式，没有引入其 SDK。
- [Sweet Home 3D 使用指南](https://www.sweethome3d.com/users-guide/)：从底图比例到墙体、家具和 3D 的实用操作顺序。
- [Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)：数字本地化的浏览器标准接口。
- [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)：浏览器、源和持久化限制。
