# mdshare

Local-first Markdown publisher for polished HTML and PDF export.

`mdshare` 是一个桌面端 Markdown 发布工具，聚焦本地写作、实时预览，以及高质量 `HTML` / `PDF` 导出。

## 当前进度

- 已初始化 `Electron + React + Vite + TypeScript` 工程骨架
- 已搭建 `Main / Preload / Renderer` 三层结构
- 已实现 `CodeMirror 6` Markdown 编辑器
- 已实现实时预览、目录生成、自动草稿恢复
- 已接入文件打开 / 保存 / 另存为 / 最近文件 / 拖拽打开
- 已优化本地图片预览路径与导出内联处理
- 已接入 `HTML` / `PDF` 导出主流程
- 已补统一启动与打包脚本
- 已补 `Vitest` 单元测试和 `Playwright` E2E 骨架
- 已补 GitHub CI 与 Release 工作流

## 一键启动

```bash
./scripts/mdshare.sh
```

或显式执行：

```bash
./scripts/mdshare.sh dev
```

## 测试

```bash
npm run test:unit
npm run test:e2e
```

## 打包当前平台

```bash
./scripts/mdshare.sh package current
```

产物输出目录：`release/`

## 多平台打包

```bash
./scripts/mdshare.sh package all
```

默认目标：

- `macOS`: `dmg`、`zip`
- `Windows`: `nsis`、`portable`
- `Linux`: `AppImage`、`deb`、`tar.gz`

也可以单独打某个平台：

```bash
./scripts/mdshare.sh package mac
./scripts/mdshare.sh package win
./scripts/mdshare.sh package linux
```

## 推送到 GitHub

先确保你本机已经登录 GitHub CLI：

```bash
gh auth login
```

初始化仓库并推送到 GitHub：

```bash
./scripts/github-publish.sh init owner/repo public
```

如果你已经有 `origin`，也可以手动推送：

```bash
git add .
git commit -m "feat: initial release setup"
git push -u origin main
```

## 生成 Release

本项目已配置 GitHub Actions：

- `CI` 工作流：推送到 `main` 或发起 PR 时运行
- `Release` 工作流：推送 `v*` 标签时自动构建多平台安装包并上传到 GitHub Release

创建并推送版本标签：

```bash
./scripts/github-publish.sh release v0.1.0
```

或者手动执行：

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

推送后，GitHub Actions 会自动：

- 创建对应的 GitHub Release
- 在 `ubuntu-latest`、`windows-latest`、`macos-latest` 上构建分发包
- 把构建产物上传到该 Release

## 说明

- 脚本会在缺少 `node_modules` 时自动执行安装
- 多平台打包依赖宿主机和本地工具链，某些跨平台构建可能失败
- `macOS` 产物建议在 `macOS` 上构建
- `Windows` 产物跨平台构建通常需要 `Wine/Mono`
- `Linux` 产物可能需要额外的系统打包依赖

## 下一步建议

- 补编辑器撤销/重做状态展示和更多快捷键
- 增强图片资源异常提示与未保存文档的图片预览策略
- 增加导出主题和打印样式细节优化
- 跑通 GitHub 仓库创建、首个 tag release 和分发包验证
