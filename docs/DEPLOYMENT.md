# 静态部署

本项目可以运行在 Cloudflare Pages、GitHub Pages 或其他静态托管服务上，无需后端、数据库或密钥。本说明以 2026-10-02 的 Cloudflare 官方静态 HTML 和 Direct Upload 文档为依据，尚未实际公开部署。

## 准备发布目录

需要 Python 3 和 Node 20+。在项目根目录运行：

```sh
python3 scripts/package.py --fetch-vendor
```

脚本下载并校验固定版本 Three.js，生成六个静态入口，把应用必需的文件复制到 `site/`。不复制 docs、tests、.git、.env 或测试截图。重复运行不会删除目录里的文件；发现不属于发布清单的额外文件时会报错。

可以在本地查看同一份发布包：

```sh
python3 -m http.server 8001 --bind 127.0.0.1 --directory site
```

访问 `http://127.0.0.1:8001/` 和 `/zh-TW/`、`/ja/`、`/de/`、`/fr/`、`/es/`。语言菜单保留相同站点下的方案；域名或端口不同的存档不自动迁移，迁移前导出 JSON。

## Cloudflare Pages

- **直接上传**：在 Workers & Pages 新建 Pages 的 Direct Upload 项目，上传 `site/` 文件夹或其内容的 ZIP。最终公开部署前需确认项目及域名。
- **Git 集成**：关联准备好的仓库，选择无框架预设，构建命令 `python3 scripts/package.py --fetch-vendor`，输出目录 `site`。项目根目录应指向含 package.json 的这个文件夹。
- 六种语言都有真实目录与 index.html，不依赖单页重写或 Pages Functions。JavaScript、CSS 和 Three.js 被所有语言共用。
- 应用的 CSP 保留 `connect-src 'none'`。语言模块是本地脚本，不需要放开连接权限，也不需要在线翻译 API。

Direct Upload 与 Git 集成是不同的 Pages 项目类型，官方说明创建后不能直接切换到另一种方式。按计划选择其一。暂未生成公共演示地址。

## GitHub Pages

附带 `.github/workflows/pages.yml`，通过 GitHub Actions 手动触发。它使用同一套发布脚本，保留六语言和本地依赖。仓库 Pages 设置需选择 GitHub Actions。子目录形式（例如 `/room-layout-planner/ja/`）由应用从模块地址推导，不写死域名或仓库名。

## 上线后验证

检查六个入口的刷新、语言切换、公制与英制、JSON 与 PNG 下载、3D，以及控制台和网络请求。线上验证与本地验证分别记录，不用工作流文件的存在代替部署成功证据。

来源：[静态 HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)；[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)。
