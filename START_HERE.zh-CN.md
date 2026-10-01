# 本次交付说明

## 当前状态

这是按上传 PRD 编写的 0.1.0 **开发预览源码**，不是完整验收或已上线的产品。
源码已经交付；55 项单元测试通过，另有浏览器测试脚本待运行。
GitHub 仓库创建与上传尚未执行，等待仓库创建权限授权。
拟使用账号 `OliverBennettdev`，拟建仓库 `room-layout-planner`。

## 本地启动

在解压后的本目录中执行：

```sh
python3 scripts/vendor.py
python3 scripts/vendor.py --check
python3 -m http.server 8000 --bind 127.0.0.1
```

第一步联网下载并校验本地 Three.js 依赖。随后访问 http://127.0.0.1:8000。
不需要 Node、npm 或构建步骤；Node 只用于运行开发单元测试。
源码包没有打包 Three.js 的三个 JavaScript 文件，所以不是完整离线包。
依赖缺失时 3D 不可用；2D 编辑采用独立模块。

## 包含的实现

英文界面；空白/示例项目；本地 PNG/JPEG 底图；两点已知长度校准；
直线墙与矩形内净尺寸；家具长宽高、位置、角度、复制删除；
公制/英制与两点测距；60 步撤销重做；本地自动保存与失败状态；
校验后 JSON 导入、JSON/PNG 导出；按需加载的 Three.js 鸟瞰和基础漫游。

这些是源码中包含的功能，不代表全部通过浏览器或真实手机验收。
底图默认不随自动保存持久化；需要备份时下载带图片的 JSON。
产品不提供自动识墙、承重/通行安全判断或装修预算。

## 测试与发布

详见 docs/TESTING.md 和 docs/unit-results.tap。浏览器测试环境受限，
没有可据以报告的端到端通过数量、实机测试、界面截图或 FPS 结果。
不要把本交付标记为所有 P0 验收通过。

.github/workflows/ 提供测试与手动 Pages 部署配置，尚未在 GitHub 运行。
下一步是完成 GitHub 创建权限授权、创建仓库并上传，再执行 CI，
修复实际发现的问题，完成浏览器验收后再发布正式演示站点。

原创代码为 MIT；第三方许可证与参考说明见 LICENSE、THIRD_PARTY_NOTICES.md。
完整操作说明见 README.zh-CN.md 和 docs/USER_GUIDE.md。
