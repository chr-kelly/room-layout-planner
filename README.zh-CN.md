<p align="center">
  <img src="assets/readme/hero.svg" alt="Room Layout Planner — 为重要的生活腾出空间" width="100%">
</p>

<h1 align="center">Room Layout Planner</h1>

<p align="center"><strong>搬家之前，先找到适合你的家具布局。</strong></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="docs/USER_GUIDE.md">使用指南</a> ·
  <a href="CONTRIBUTING.md">参与贡献</a> ·
  <a href="LICENSE">MIT 许可证</a>
</p>

免费、优先在本地处理的 **2D / 3D 房间家具试摆工具**。画出房间，按真实尺寸摆放家具，
再用 3D 查看布局。可以从空白房间开始，也可以直接试用示例，或导入户型图片、校准比例后描墙。

**无需账号或订阅。** 图片和方案由浏览器本地处理。导出 JSON 可以继续编辑，导出 PNG 可以展示布局。

> **0.1.0 · 开发预览。** 下方图片来自实际本地运行。
> 完整浏览器和真实设备验收仍待完成，详见 [测试记录](docs/TESTING.md)。

## 看看实际效果

| 在 2D 中试摆 | 在 3D 中查看 |
| --- | --- |
| <img src="assets/readme/editor-2d.jpg" alt="真实 2D 编辑器截图：示例房间、家具库、尺寸与属性面板" width="480"> | <img src="assets/readme/editor-3d.jpg" alt="同一示例房间的真实 3D 截图：长方体家具与剖切墙面" width="480"> |
| 拖动家具，输入准确尺寸。 | 旋转、缩放，或进行基础漫游。 |

示例房间的**内净尺寸为 4 × 3 米**。3D 家具使用简单长方体，地面是示意平面。

## 帮你回答一个实际问题

**这些家具，怎样摆进我的房间？** 用实测尺寸试摆沙发、床、书桌、椅子、柜子或茶几，调整布局后再比较。

| 功能 | 用处 |
| --- | --- |
| **按比例开始** | 输入矩形房间内净尺寸，或导入 PNG/JPEG，用已知长度校准。 |
| **使用自己的家具尺寸** | 6 种可编辑预设与自定义家具，设置长宽高、位置和角度。 |
| **试摆和测量** | 拖动、旋转、复制家具，绘制直线墙，测量两点距离。 |
| **切换视角** | 在 2D 编辑同一份方案，用只读 3D 鸟瞰和基础漫游查看。 |
| **保存方案** | 浏览器本地自动保存、60 步撤销重做、校验后导入导出 JSON、导出 2D PNG。 |
| **选择尺寸单位** | 公制或独立的英尺/英寸输入；切换单位不会改变真实几何。 |

## 快速开始

在 `room-layout-planner` 文件夹中打开终端，执行：

```sh
python3 scripts/vendor.py
python3 scripts/vendor.py --check
python3 -m http.server 8000 --bind 127.0.0.1
```

访问 **http://127.0.0.1:8000**，点击 **Try an example**。

1. **建立房间。** 输入内净尺寸，或导入户型图片，用实测长度校准。
2. **试摆家具。** 添加家具，输入它的实际尺寸，再拖动、旋转。
3. **检查并备份。** 切换 3D 查看，导出 PNG，同时下载可继续编辑的 JSON。

Python 3 即可启动静态服务，无需应用构建。第一条命令从 Three.js 官方上游下载固定版本并校验 SHA-256。
文件已经齐备时可以跳过第一条，执行第二条校验现有文件。Node/npm 仅用于开发测试。

<details>
<summary><strong>本地依赖与离线运行</strong></summary>

本项目是源码分发。3D 运行前需要具备依赖文件，`scripts/vendor.py` 会下载固定版本文件。
下载需要联网，应用运行时使用本地依赖，不使用 CDN。下载失败会显示错误；缺少 3D 依赖时仍可使用 2D 编辑。

通过 HTTP 静态服务访问。不要直接双击 `index.html`，浏览器会限制 `file://` 下的 ES 模块。

文件齐备后，本地静态服务可以在无外网环境下使用。在线托管版本没有实现 service worker / PWA 离线安装。

</details>

## 你的数据由你保存

没有业务后端、账号、分析统计、广告、远程字体或 AI 接口。应用不会上传图片或方案。
托管服务仍可能记录普通网页访问日志。详见 [隐私与数据限制](docs/PRIVACY.md)。

**主动下载 JSON 备份。** 自动保存属于当前浏览器、当前站点，不能自动跨设备同步。
图片默认只保留在当前会话内存中；刷新后重新选图、确认配准，或导入带图片的 JSON。

<details>
<summary><strong>尺寸、图片和当前边界</strong></summary>

- 几何数据内部统一用米保存，切换单位不缩放几何。
- 墙上 **CL** 标签表示中心线长度，不是房间内净尺寸。
- 重新校准底图不会缩放已画的墙和家具。
- 替换为相同像素尺寸的图片，也需要明确确认配准。
- 单楼层、直线墙、长方体家具；不提供门窗模型、PDF 导入、自动识图、预算、多人协作或云同步。
- PNG/JPEG 和 JSON 输入各最多 10 MiB，图片最多 1600 万像素；内嵌图片最多 2 MiB。
  墙段、家具、测量各最多 200 个。刷新后不保留撤销历史。
- 3D 剖切只改变墙面的显示高度，不改变保存的墙高。漫游不检查碰撞、可达性或通道间隙。
  家具重叠也不会自动判定。
- 隐私浏览、清理站点数据、存储额度不足，以及更换站点或端口，都会影响恢复。备份保存在浏览器之外。

</details>

**仅供布局规划，必须现场核实。** 检查真实家具、墙体、门、电梯、搬运路径与间隙。
本工具不作施工、承重、合规、搬运可达性或安全判断。

## 语言

当前应用界面为**英语**，本文件提供中文说明。下一版已选定英语、繁体中文、日语、德语、法语、西班牙语。
这 6 种界面的翻译仍处于改造方案阶段，尚未实现或验证。

## 自行托管

这是静态网站，可以部署到 **Cloudflare Pages**，或其他能正确提供 JavaScript 模块类型的静态托管服务。
一起打包 `index.html`、`favicon.svg`、`src/`、`vendor/`、`LICENSE` 和 `THIRD_PARTY_NOTICES.md`。
参见 [Cloudflare 静态 HTML 部署说明](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)。

附带的 [GitHub Pages 工作流](.github/workflows/pages.yml) 会下载、校验依赖，只打包应用资源。
需将仓库 Pages 配置为使用 GitHub Actions，再手动运行。它与 Cloudflare Pages 是两种独立托管方式。

**本次交付尚未发布公开演示站点。** GitHub 工作流也尚未运行；配置文件和本地截图不等于线上部署验证。

## 开发与贡献

保持应用静态、优先在本地处理。阅读 [贡献指南](CONTRIBUTING.md)、[架构说明](docs/ARCHITECTURE.md)、
[使用指南](docs/USER_GUIDE.md) 和 [安全说明](SECURITY.md)。

```sh
node --test tests/*.test.js
python3 scripts/vendor.py --check
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
python3 tests/browser_test.py
```

浏览器测试脚本会管理自己的本地服务。可用 `CHROMIUM_PATH` 指向已安装的 Chromium；
实际报告和截图保存在 `test-results/`。编写覆盖与实际运行分开记录，见 [TESTING](docs/TESTING.md)。

<details>
<summary><strong>项目结构</strong></summary>

```text
index.html                应用入口与可访问控件
src/model.js              校验、几何、单位与撤销历史
src/app.js                编辑、弹窗、手势与生命周期
src/viewport.js           2D 画布、命中判断与 PNG 导出
src/scene3d.js             按需加载的 Three.js 鸟瞰和漫游
src/images.js             图片校验、解码与压缩
src/storage.js            可报告错误的 localStorage 适配
vendor/three/             固定版本依赖与 MIT 许可证
examples/                 可编辑示例与校准图片
assets/readme/            原创封面与真实本地截图
scripts/                  依赖下载与校验
.github/workflows/        测试与手动 GitHub Pages 部署
```

</details>

## 许可证与致谢

原创实现采用 **[MIT](LICENSE)**。Three.js 和控制器保留上游 MIT 许可证，见 [第三方说明](THIRD_PARTY_NOTICES.md)。

参考 [wy51ai/floorplan-3d](https://github.com/wy51ai/floorplan-3d)。本项目独立实现底图校准与手动描墙，
未复用其固定户型数据。
