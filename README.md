# mdshare

![Version](https://img.shields.io/badge/version-v0.2.0-2563eb)
![Electron](https://img.shields.io/badge/Electron-33.x-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)

> Local-first, export-first Markdown publisher for polished HTML and PDF delivery.

一个面向交付的本地 Markdown 桌面工具：边写边看接近成品的效果，并一键导出 HTML / PDF。

## 目录

- [项目定位](#项目定位)
- [核心特性](#核心特性)
- [界面预览](#界面预览)
- [适合场景](#适合场景)
- [当前能力清单](#当前能力清单)
- [快速开始](#快速开始)
- [常用命令](#常用命令)
- [典型使用流程](#典型使用流程)
- [产品边界](#产品边界)
- [和其他工具的区别](#和其他工具的区别)
- [技术栈](#技术栈)
- [打包说明](#打包说明)
- [补充说明](#补充说明)
- [License](#license)

## 项目定位

很多 Markdown 工具更偏向编辑体验、知识管理或格式转换能力。

`mdshare` 聚焦的是另一个更具体的问题：**当内容已经写完后，怎样更快把它整理成一份可以直接发出去的成品。**

它不是更大的笔记系统，也不是更复杂的转换引擎，而是一条更短、更稳的 Markdown 交付路径。

## 核心特性

- **预览接近成品**：编辑过程中尽量贴近最终导出效果，减少导出后返工
- **HTML / PDF 导出**：一键导出可交付成品，而不是只停留在 Markdown 原文
- **导出预设**：内置 `默认文档`、`流程 SOP`、`分享长文` 三种导出场景
- **技术文档友好**：支持代码高亮、标题锚点、目录、图片、Mermaid 图表
- **Callout 支持**：支持 `TIP / NOTE / WARNING / IMPORTANT / CAUTION` 提醒块渲染
- **交付前检查**：导出前可执行健康检查，提前发现常见结构问题
- **本地优先工作流**：最近文件、自动保存、草稿恢复、设置持久化都在本地完成

## 界面预览

> 当前仓库暂未附带截图。建议后续补充编辑区、实时预览区、导出效果三个典型界面截图，方便在 GitHub 首页直接展示产品形态。

## 适合场景

- 技术方案、项目说明、设计文档
- SOP / 操作手册 / 内部流程文档
- 周报、复盘、分享文章
- 任何“写完就要导出给别人看”的 Markdown 内容

## 当前能力清单

- [x] Markdown 文件新建、打开、保存、另存为
- [x] 左侧编辑、右侧实时预览
- [x] 标题锚点与目录生成
- [x] 代码块高亮与语言标签优化
- [x] Mermaid 图表预览与导出
- [x] `TIP / NOTE / WARNING / IMPORTANT / CAUTION` Callout 渲染
- [x] 图片查看与导出处理
- [x] HTML 导出
- [x] PDF 导出
- [x] 最近文件、拖拽打开、自动保存、草稿恢复
- [x] 深色 / 浅色主题切换
- [x] 导出前健康检查

## 快速开始

### 环境要求

开始前请确保本机已安装：

- `node`
- `npm`

如果要构建桌面安装包，还需要对应平台的本地工具链。

### 安装依赖

```bash
npm install
```

如果你希望通过封装脚本启动开发流程，也可以直接使用：

```bash
./scripts/mdshare.sh dev
```

### 启动开发模式

```bash
npm run dev
```

或：

```bash
./scripts/mdshare.sh dev
```

启动后会进入 Electron 桌面应用，支持边编辑边预览。

## 常用命令

| 场景 | 命令 |
| --- | --- |
| 安装依赖 | `npm install` |
| 启动开发模式 | `npm run dev` |
| 类型检查 | `npm run typecheck` |
| 单元测试 | `npm run test:unit` |
| 端到端测试 | `npm run test:e2e` |
| 构建应用 | `npm run build` |
| 打包当前平台 | `npm run dist:current` |
| 打包 macOS | `npm run dist:mac` |
| 打包 Windows | `npm run dist:win` |
| 打包 Linux | `npm run dist:linux` |

如果你更喜欢脚本入口，也可以使用：

- `./scripts/mdshare.sh dev`
- `./scripts/mdshare.sh build`
- `./scripts/mdshare.sh package current`
- `./scripts/mdshare.sh package mac`
- `./scripts/mdshare.sh package win`
- `./scripts/mdshare.sh package linux`

## 典型使用流程

1. 打开或新建一个 Markdown 文件
2. 在左侧编辑正文内容
3. 在右侧查看接近最终成品的实时预览
4. 检查目录、代码块、图片、链接、Callout、Mermaid 等内容效果
5. 一键导出 HTML 或 PDF，直接发送或归档

## 产品边界

`mdshare` 当前不打算做这些事情：

- 云协作
- 知识库管理
- 富文本所见即所得编辑
- 多格式输入兼容
- 复杂插件系统

它更像一个：

- Markdown 发布器
- Markdown 导出工作台
- 本地交付型文档工具

## 和其他工具的区别

| 工具 | 更擅长什么 | `mdshare` 更关注什么 |
| --- | --- | --- |
| Typora | 写作体验与所见即所得感 | 写完后尽快导出成可交付文档 |
| Pandoc | 多格式转换与自动化管线 | 开箱即用的预览与导出体验 |
| Obsidian | 知识管理、双链、插件生态 | 单篇 Markdown 文档的成品化交付 |

如果你的核心任务是“写完就导出，导出就能发”，那么 `mdshare` 会比更大的系统更直接。

## 技术栈

- `Electron`
- `React`
- `Vite`
- `TypeScript`
- `CodeMirror 6`
- `markdown-it`
- `highlight.js`
- `Zustand`
- `electron-builder`
- `Vitest`
- `Playwright`

## 打包说明

所有打包产物默认输出到：

```bash
release/
```

需要注意：

- macOS 安装包需要在 macOS 上构建
- Windows 安装包在 macOS / Linux 上可能依赖额外工具链
- Linux 打包可能需要额外系统依赖
- 跨平台打包是否成功，取决于当前宿主系统和本地 Electron Builder 工具链

## 补充说明

如果你想看更完整的项目介绍，可以参考 `docs/project-introduction.md`。

## License

Apache-2.0
