# 开源项目使用说明

## 当前状态

这是 Room Layout Planner 0.1.0 开发预览源码，采用 [MIT 许可证](LICENSE)。
包含英语、繁体中文、日语、德语、法语、西班牙语界面；英语走根路径，繁中入口为 `/zh-TW/`。

2026-10-02 的开源前实际验证：64 项单元测试通过，0 失败、0 跳过；
39 个浏览器场景通过，0 失败；六语言静态打包通过。
详见 [测试记录](docs/TESTING.md) 和 [项目状态](docs/status.md)。
真实手机、其他浏览器和独立母语审校仍待验收。公开仓库推送正在准备，尚未部署公开演示站点。

## 本地启动

在项目根目录执行：

```sh
python3 scripts/vendor.py --check
python3 -m http.server 8000 --bind 127.0.0.1
```

访问 **http://127.0.0.1:8000/zh-TW/**，点击 **試用範例**，或从顶部菜单选择其他语言。

仓库已包含固定版本 Three.js 文件及上游 MIT 许可证。如果依赖缺失，先运行
`python3 scripts/vendor.py` 联网下载并校验。文件齐备后，本地运行不需要外网。
Python 3 即可启动；Node 20+ 用于开发测试、更新静态语言入口和准备部署包。

## 包含的实现

空白和示例项目；本地 PNG/JPEG 户型图与两点比例校准；直线墙与矩形内净尺寸；
家具尺寸、位置、角度、拖动、复制和删除；公制/英制与两点测距；60 步撤销重做；
本地自动保存与失败提示；经过校验的 JSON 导入导出、2D PNG 导出；
同一方案的 Three.js 鸟瞰和基础漫游；六语言就地切换并保留草稿与历史。

底图默认不随自动保存持久化；需要备份时下载带图片的 JSON。
完整操作说明和功能边界见 [中文 README](README.zh-CN.md) 与 [使用指南](docs/USER_GUIDE.md)。

## 测试与部署

测试命令和依赖安装见 [测试记录](docs/TESTING.md)。保留全部原始测试与断言。
测试截图、`.env`、`node_modules/`、`.venv/`、`site/` 和宣传成片 `out/` 已由 Git 忽略。
宣传片源码、来源及重现步骤保留在 [marketing/room-plan-video](marketing/room-plan-video/README.md)。

运行 `python3 scripts/package.py --fetch-vendor` 生成只含应用资源的 `site/`。
部署方法见 [静态部署说明](docs/DEPLOYMENT.md)。测试工作流在推送后自动运行；
Pages 部署工作流需要手动触发。源码公开与演示网站上线分别记录。

第三方依赖与参考说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
