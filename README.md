# mdshare

一个本地优先的 Markdown 发布客户端，专注把 Markdown 内容快速整理成可预览、可导出、可直接交付的 PDF / HTML 成品。

## 背景

我平时习惯用 Markdown 来记录各种信息：想法、文档、流程、说明、笔记。

Markdown 的好处很明显：轻量、纯文本、写起来快，也方便长期保存和管理。

但当这些内容需要发给别人时，Markdown 原文往往并不是最合适的交付形式。很多场景下，更希望给出去的是一个排版稳定、打开就能看的 PDF。

于是需求就变得很具体：

- 写的时候，继续保留 Markdown 的简单和高效
- 给别人的时候，能够直接导出为 PDF 成品
- 导出之前，最好可以先快速预览最终效果

`mdshare` 就是在这样的使用习惯下产生的。

它不是一个追求“大而全”的 Markdown 编辑器，而是一个更偏向“实时预览 + 成品导出”的本地桌面工具。

## 为什么做这个项目

很多时候，真正缺的不是更复杂的编辑能力，而是一条足够顺手的交付链路：

- 用熟悉的 Markdown 写内容
- 一边编辑，一边预览接近最终成品的效果
- 一键导出 PDF / HTML
- 尽量减少导出之后再去二次调整样式的成本

所以 `mdshare` 选择了本地优先、导出优先、只做 Markdown 的路线。

## 核心能力

当前项目聚焦这些能力：

- 本地打开、新建、保存、另存为 Markdown 文件
- 左侧编辑、右侧实时预览
- 自动保存与异常草稿恢复
- 目录生成与标题锚点
- 代码块高亮
- 本地图片预览与导出处理
- 一键导出 HTML
- 一键导出 PDF
- 最近文件与拖拽打开
- 深色 / 浅色主题切换

## 产品边界

`mdshare` 当前不想做这些事情：

- 云协作
- 知识库管理
- 富文本所见即所得
- 多格式输入兼容
- 复杂插件系统

它更像一个：

- Markdown 发布器
- Markdown 导出工作台
- 本地交付型文档工具

## 适合谁

这个项目更适合：

- 开发者
- 产品经理
- 运维 / 交付工程师
- 技术讲师与写作者

尤其适合那些习惯使用 Markdown 记录内容，同时又需要快速输出正式 PDF 成品的人。

## 安装

### 环境要求

开始前请先确保本机已经安装：

- `node`
- `npm`

如果你要做桌面端安装包打包，还需要对应平台的本地工具链。

### 安装依赖

克隆仓库后，在项目根目录执行：

```bash
npm install
```

如果你希望直接通过封装脚本启动开发流程，也可以使用：

```bash
./scripts/mdshare.sh dev
```

这个脚本会在依赖缺失时自动安装依赖，然后启动桌面应用开发模式。

## 使用

### 开发模式启动

推荐命令：

```bash
./scripts/mdshare.sh dev
```

等价命令：

```bash
npm run dev
```

启动后会进入 Electron 桌面应用，支持边编辑边预览。

### 构建项目

如果你只想验证本地构建是否正常，可以执行：

```bash
./scripts/mdshare.sh build
```

等价命令：

```bash
npm run build
```

这个过程会完成：

- 图标资源生成
- 前端渲染层构建
- Electron 主进程构建

### 应用内使用方式

进入应用后，典型使用流程是：

1. 打开或新建一个 Markdown 文件
2. 在左侧编辑内容
3. 在右侧实时查看接近最终导出效果的预览
4. 检查目录、代码块、图片、链接等展示是否符合预期
5. 导出为 HTML 或 PDF 成品，直接发送给他人

## 打包发布

### 打包当前平台

如果你只想在当前机器上生成对应平台的安装包或可分发文件：

```bash
./scripts/mdshare.sh package current
```

等价命令：

```bash
npm run dist:current
```

### 按平台打包

#### macOS

```bash
./scripts/mdshare.sh package mac
```

等价命令：

```bash
npm run dist:mac
```

产物通常包括：

- `dmg`
- `zip`

#### Windows

```bash
./scripts/mdshare.sh package win
```

等价命令：

```bash
npm run dist:win
```

产物通常包括：

- `nsis`
- `portable`

#### Linux

```bash
./scripts/mdshare.sh package linux
```

等价命令：

```bash
npm run dist:linux
```

产物通常包括：

- `AppImage`
- `deb`
- `tar.gz`

### 尝试多平台打包

```bash
./scripts/mdshare.sh package all
```

这个命令会依次尝试打包 `macOS / Windows / Linux`，但是否成功取决于当前宿主系统和本地工具链。

### 打包输出目录

所有打包产物默认输出到：

```bash
release/
```

### 打包说明

需要注意：

- macOS 安装包需要在 macOS 上构建
- Windows 安装包在 macOS / Linux 上可能依赖额外工具链
- Linux 打包可能需要额外的本地系统依赖
- 跨平台打包是否成功，取决于当前系统环境和 Electron Builder 可用工具链

## 技术栈

当前项目主要使用这些技术：

- `Electron`：桌面端应用壳与原生能力接入
- `React`：界面组件组织与交互实现
- `Vite`：前端开发与构建工具
- `TypeScript`：主进程、预加载层、渲染层统一类型约束
- `CodeMirror 6`：Markdown 编辑器体验
- `markdown-it`：Markdown 解析
- `highlight.js`：代码块高亮
- `Zustand`：轻量状态管理
- `electron-builder`：桌面安装包构建
- `Vitest` / `Playwright`：单元测试与端到端测试

## 项目结构

项目目录大致如下：

```text
.
├── electron/              # Electron 主进程与 preload
│   ├── main/              # 主进程入口、IPC、服务层
│   └── preload/           # 暴露给渲染层的安全桥接 API
├── src/                   # React 渲染层
│   ├── app/               # 应用装配与状态组织
│   ├── components/        # UI 组件
│   ├── lib/markdown/      # Markdown 解析与导出相关逻辑
│   ├── styles/            # 全局样式
│   └── types/             # 前端类型声明
├── public/                # 静态资源与图标源文件
├── build/                 # 构建输出所需图标资源
├── scripts/               # 开发、构建、打包辅助脚本
├── tests/                 # 单测与 E2E 测试
├── dist/                  # 前端构建产物
├── dist-electron/         # Electron 编译产物
└── release/               # 打包输出目录
```

## 开发说明

### 常用命令

开发过程中常用这些命令：

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npm run preview
```

如果你更习惯统一入口，也可以优先使用：

```bash
./scripts/mdshare.sh dev
./scripts/mdshare.sh build
./scripts/mdshare.sh package current
```

### 开发流程建议

一个比较顺手的本地开发流程通常是：

1. 先执行 `npm install`
2. 用 `./scripts/mdshare.sh dev` 启动桌面开发模式
3. 修改渲染层或 Electron 逻辑后，用 `npm run typecheck` 做类型检查
4. 功能稳定后执行 `npm run test:unit`
5. 发布前执行 `npm run build` 或打包命令做最终验证

### 图标与构建资源

项目的图标源文件位于：

- `public/icon.svg`
- `public/icon.png`
- `public/icon-512.png`
- `public/icon-256.png`

构建时会通过：

```bash
./scripts/build-icons.sh
```

自动生成打包所需的：

- `build/icon.png`
- `build/icon.ico`
- `build/icon.icns`

## 当前方向

`mdshare` 的核心方向一直很明确：

- 只做 Markdown
- 本地优先
- 预览尽量接近最终导出效果
- 优先把 PDF / HTML 导出质量做好

一句话总结：

> 这不是一个“Markdown 编辑器”，而是一个“Markdown 成品导出客户端”。

## License

Apache-2.0
