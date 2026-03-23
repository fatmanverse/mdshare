# Markdown 发布客户端 MVP PRD

## 1. 产品一句话

帮用户在本地桌面端编写 Markdown，并一键导出为多种高质量成品格式。

## 2. 产品定位

这个产品不是“又一个 Markdown 编辑器”，而是：

- 一个本地优先的 Markdown 编写工具
- 一个导出优先的 Markdown 发布客户端
- 一个把 Markdown 变成可分享、可打印、可交付成品的工具

核心关键词：

- 本地客户端
- 仅支持 Markdown
- 导出质量优先
- 多格式输出

## 3. 为什么要做这个

### 3.1 现有工具很多，但不完全满足“写完就导出交付”

市场上已经有很多成熟工具：

- 编辑器：`Typora`、`MarkText`、`Obsidian`
- 转换器：`Pandoc`
- 文档站：`VitePress`、`Docusaurus`、`MkDocs`

但它们的侧重点并不一样：

- 有的偏写作体验
- 有的偏知识管理
- 有的偏文档站构建
- 有的偏格式转换能力

对很多用户来说，真正要解决的问题很简单：

- 本地写 Markdown
- 边写边看效果
- 一键导出成可以直接交付的文件

### 3.2 本地客户端比 Web 更适合这个方向

如果目标是“稳定地管理文件和导出成品”，本地客户端更自然：

- 文件打开、保存、另存为、最近文件更符合桌面习惯
- 不依赖浏览器权限和缓存机制
- 更容易处理本地图片、字体、模板和打印
- 离线可用，隐私更强
- 更像一个真正能长期使用的生产力工具

### 3.3 只支持 Markdown，反而更聚焦

这个产品不需要一开始支持各种输入格式。

聚焦 `Markdown` 有几个好处：

- 产品边界清晰
- 实现复杂度可控
- 用户认知明确
- 可把精力放在导出质量上，而不是做复杂导入兼容

### 3.4 真正的机会在“导出质量”

这个产品要卖的不是“支持 Markdown”，而是：

- 导出成品够好看
- 导出格式够实用
- 导出过程够简单
- 导出的结果能直接发给别人

## 4. 核心判断

### 4.1 不做什么

MVP 不把自己定义为：

- 知识管理工具
- 云端协作文档平台
- 多格式文档编辑器
- 全能笔记软件
- 静态站点生成器

### 4.2 做什么

MVP 定位为：

- 一个专注 Markdown 的本地桌面客户端
- 一个支持实时预览的写作工具
- 一个支持多格式导出的发布工具

### 4.3 产品核心价值

MVP 要突出这 4 个价值：

- 少折腾：写完就能导出
- 少配置：默认就有高质量模板和样式
- 少依赖：本地运行，不依赖服务器
- 少返工：一份 Markdown，多种输出结果

## 5. 目标用户

### 5.1 核心用户画像

- 开发者：写 README、设计文档、接口文档、技术方案
- 运维/交付工程师：写部署手册、巡检报告、验收文档
- 产品经理：写 PRD、需求说明、汇报材料
- 技术讲师/写作者：写教程、课程资料、演讲稿

### 5.2 非目标用户

- 需要多人在线协作的团队
- 需要企业级权限与审计的平台用户
- 需要 Word 级复杂排版的专业出版用户

## 6. 用户场景

### 6.1 场景 A：技术文档快速成品化

用户写完 Markdown 后，希望一键导出：

- 漂亮的 HTML
- 可打印的 PDF
- 可发客户的成品文件

### 6.2 场景 B：一份内容，多种输出

用户希望同一份 Markdown 同时输出：

- 在线查看版 HTML
- 打印版 PDF
- 后续发布用 Markdown 原文

### 6.3 场景 C：本地离线写作和导出

用户在内网、演示环境、客户现场或离线环境下，希望：

- 不联网也能用
- 不依赖账号
- 不依赖浏览器在线服务

### 6.4 场景 D：交付材料快速生成

用户希望把方案文档、部署手册、培训资料快速导出成可直接发人的成品。

## 7. 用户痛点

- Markdown 写作工具多，但导出结果质量不一致
- 不同导出格式需要不同工具，链路长
- 导出后的 HTML/PDF 常常还要手动再修样式
- 在线工具有隐私风险或网络依赖
- 文档站方案太重，不适合只导出单个文档

## 8. 产品目标

### 8.1 业务目标

- 验证“桌面端 Markdown 发布工具”定位是否成立
- 验证用户是否愿意长期使用一个专注导出的本地工具
- 为后续开源传播和模板生态打基础

### 8.2 用户目标

- 在 1 分钟内开始写作
- 在写作过程中看到接近最终成品的预览效果
- 在 1 次操作内导出高质量 HTML/PDF

## 9. 核心竞争思路

### 9.1 不和现有工具拼“大而全”

产品不和 `Obsidian` 拼：

- 知识库
- 插件生态
- 双链
- 工作区

产品不和 `Pandoc` 拼：

- 支持格式数量
- 命令行复杂能力
- 工程化流水线

产品也不和 `Typora` 拼：

- 所有写作体验细节
- 富文本所见即所得路线

### 9.2 差异化方向

产品要抓住一个清晰认知：

- 写 Markdown 用它
- 导出成品也用它
- 导出质量是第一卖点

也就是说，这个产品更接近：

- Markdown 发布器
- Markdown 导出工作台

而不是：

- 笔记软件
- 文档平台
- 通用编辑器

## 10. MVP 范围

### 10.1 MVP 要做

#### 编辑能力

- 新建 Markdown 文档
- 打开本地 `.md` 文件
- 保存与另存为
- 基础编辑能力
- 自动保存草稿

#### 预览能力

- 左侧编辑、右侧实时预览
- 支持常见 Markdown 语法
- 代码高亮
- 标题锚点
- 目录导航

#### 导出能力

- 导出 `HTML`
- 导出 `PDF`
- 导出时可选择主题模板
- 导出时保留目录和代码高亮

#### 桌面能力

- 最近打开文件
- 拖拽打开文件
- 文件改动未保存提醒
- 深色/浅色界面主题

### 10.2 MVP 暂不做

- 账号系统
- 云同步
- 协同编辑
- 多标签复杂工作区
- 所见即所得富文本模式
- 插件市场
- AI 辅助写作

## 11. 导出格式策略

### 11.1 为什么不能一开始做太多格式

“支持多格式导出”听起来很有吸引力，但每增加一种格式，都会增加：

- 渲染差异
- 样式适配成本
- 图片与资源处理复杂度
- 测试成本

所以导出格式必须分阶段做。

### 11.2 MVP 格式范围

#### P0

- `HTML`
- `PDF`

原因：

- 这两种最常用
- 最适合“分享”和“打印”
- 技术实现也最可控

#### P1

- `DOCX`

适合：

- 商务交付
- 客户文档流转
- 需要继续编辑的场景

#### P2

- `EPUB`
- `图片长图`
- `演示稿样式导出`

### 11.3 导出设计原则

- 一份 Markdown 多份成品
- 输出结果优先保证稳定和可读性
- 不追求支持最多格式，先追求最常用格式足够好

## 12. 信息架构

### 12.1 主界面结构

- 顶部：文件与导出工具栏
- 左侧：Markdown 编辑区
- 右侧：实时预览区
- 右侧浮层：目录导航
- 底部：状态栏

### 12.2 顶部工具栏

- 新建
- 打开
- 保存
- 另存为
- 导出
- 主题切换
- 最近文件

### 12.3 状态栏

- 文件状态
- 字数
- 行数
- 自动保存状态
- 当前导出模板

## 13. 核心交互流程

### 13.1 新建文档流程

- 打开应用
- 创建新文档
- 左侧开始编写 Markdown
- 右侧实时预览
- 点击导出
- 选择 `HTML` 或 `PDF`
- 生成成品文件

### 13.2 编辑已有文档流程

- 打开本地 `.md`
- 应用加载文件内容
- 右侧自动渲染
- 用户修改文档
- 自动保存草稿
- 完成后导出

### 13.3 导出流程

- 点击导出按钮
- 选择导出格式
- 选择导出主题
- 选择保存路径
- 导出完成并可直接打开

## 14. 功能明细与验收标准

### 14.1 文件管理

功能要求：

- 支持新建、打开、保存、另存为
- 支持最近文件列表
- 支持拖拽打开 Markdown 文件

验收标准：

- 常见桌面操作符合用户习惯
- 打开本地文件后 1 秒内展示内容

### 14.2 编辑器

功能要求：

- 支持基础 Markdown 输入
- 支持撤销/重做
- 支持缩进和常用快捷键

验收标准：

- 中小型文档编辑流畅
- 常见键盘操作无明显异常

### 14.3 实时预览

功能要求：

- 支持标题、列表、表格、代码块、引用、图片
- 支持目录生成
- 支持代码高亮

验收标准：

- 编辑后 `200ms` 内预览更新
- 常见 Markdown 语法渲染正确

### 14.4 HTML 导出

功能要求：

- 导出为完整可打开的 HTML 文件
- 保留主题、目录、代码高亮
- 支持离线查看

验收标准：

- 断网状态下 HTML 文件可正常展示
- 不依赖外部 CDN 才能工作

### 14.5 PDF 导出

功能要求：

- 导出 PDF 保留主要版式
- 支持页边距、分页、标题层级清晰

验收标准：

- A4 打印效果可接受
- 代码块、表格、图片不明显错位

### 14.6 自动保存

功能要求：

- 编辑过程中自动保存临时草稿
- 意外关闭后可恢复

验收标准：

- 异常关闭后能恢复最近一次草稿

## 15. 非功能需求

- 本地运行，不依赖后端服务
- 支持 `macOS`、`Windows`
- 未来可扩展到 `Linux`
- 离线可用
- 启动速度可接受
- 处理 `1MB` 以内 Markdown 文档时流畅

## 16. 技术方案建议

### 16.1 桌面框架选择

如果 `PDF` 导出是 MVP 的核心能力，建议优先考虑：

- `Electron`

原因：

- 内置 `printToPDF` 能力，更适合把 PDF 导出作为首版能力
- 文件系统、打印、窗口控制相关生态更成熟
- 更适合先快速验证“导出优先”的产品路线

备选：

- `Tauri`

适合：

- 更看重安装包体积
- 愿意把“真正的 PDF 导出”延后处理
- 可以接受先用系统打印路径替代一部分导出体验

### 16.2 前端技术栈

- `React + Vite`
- 编辑器：`CodeMirror 6`
- Markdown 解析：`markdown-it`
- 代码高亮：`shiki` 或 `highlight.js`
- 样式系统：CSS Variables 或 `Tailwind CSS`

### 16.3 导出实现建议

#### HTML

- 由前端拼装完整页面
- 内联样式与必要脚本

#### PDF

- 基于桌面端打印能力生成
- 优先保证版式稳定和结果可预测

#### DOCX

- 放到后续版本
- 需要单独评估排版损失和依赖链

## 17. 开发优先级

### P0

- 文件打开/保存
- Markdown 编辑
- 实时预览
- HTML 导出
- PDF 导出
- 自动保存

### P1

- 最近文件
- 拖拽打开
- 目录导航
- 导出主题

### P2

- DOCX 导出
- 导出模板系统
- 图片资源打包优化

## 18. 版本规划

### V0.1

- Markdown 编辑
- 实时预览
- HTML 导出
- PDF 导出
- 自动保存

### V0.2

- 最近文件
- 目录导航
- 导出主题切换
- 打印样式优化

### V0.3

- DOCX 导出
- 模板系统
- 封面、页眉页脚配置

## 19. 项目成功标准

- 用户首次打开后 5 分钟内完成第一次导出
- 用户能明确感知“导出质量”是这个工具的主要价值
- HTML 和 PDF 是用户愿意直接发送出去的成品
- 用户不需要借助第二个工具再修样式

## 20. 为什么这个方向比纯 Web 更值得做

### 20.1 更符合“工具软件”的使用习惯

文档编辑、文件管理、导出、打印，本来就是桌面客户端天然擅长的能力。

### 20.2 更适合长期使用

本地客户端更容易形成：

- 最近文件
- 本地模板
- 导出设置
- 用户习惯路径

### 20.3 更容易建立“专业工具”认知

浏览器工具更像临时页面，桌面客户端更像可长期安装和复用的生产力软件。

## 21. 建议的开工顺序

### 第 1 周

- 搭建 `Electron + React + Vite` 工程
- 完成左右布局
- 接入编辑器
- 实现基础预览

### 第 2 周

- 完成文件打开/保存
- 完成自动保存
- 完成 HTML 导出

### 第 3 周

- 完成 PDF 导出
- 完成目录和主题
- 优化代码高亮和打印样式

### 第 4 周

- 增加最近文件
- 增加拖拽打开
- 写 README 和 Demo 文档

## 22. 最终建议

如果按副业和开源项目来做，最稳妥的路线是：

- 输入只做 `Markdown`
- MVP 只做 `HTML + PDF`
- 产品核心卖点放在“导出成品质量”
- 桌面端优先，Web 端不作为首发重点
- 如果 `PDF` 是首版必须交付的能力，MVP 实现优先选 `Electron`

一句话总结：

这不是一个“Markdown 编辑器”，而是一个“Markdown 成品导出客户端”。

## 23. 附录：README 文案素材

### 23.1 项目一句话

英文：

Local-first Markdown publisher for polished HTML and PDF export.

中文：

一个本地优先的 Markdown 发布客户端，帮你把文档一键导出成可分享、可打印的成品。

### 23.2 Hero 文案

主标题：

把 Markdown 一键变成可分享的成品

副标题：

`mdshare` 是一个本地客户端工具，专注于 Markdown 的编写、实时预览，以及高质量 `HTML` / `PDF` 导出。它不是笔记软件，也不是知识库，而是一个导出优先的 Markdown 发布器。

### 23.3 核心卖点文案

- `Local-first`：本地打开、本地保存、本地导出，不依赖账号、不依赖服务端，离线也能工作
- `Export-first`：不仅能写 Markdown，更重要的是能稳定导出漂亮的 `HTML` 和 `PDF` 成品
- `Preview what you ship`：左侧编写，右侧实时预览，尽量让预览结果接近最终导出结果
- `Stay simple`：只做 Markdown，不做知识库，不做协作平台，不做复杂插件系统

### 23.4 README 初稿

````md
# mdshare

Local-first Markdown publisher for polished HTML and PDF export.

`mdshare` is a desktop app for writing Markdown, previewing the final result, and exporting polished deliverables. It focuses on one thing: turning Markdown into output you can actually ship.

## Features

- Local Markdown editing
- Live side-by-side preview
- One-click HTML export
- One-click PDF export
- Built-in light and dark themes
- Table of contents and heading anchors
- Code block highlighting
- Autosave and recovery draft
- Recent files

## Why mdshare

There are already many Markdown editors and many document converters.
`mdshare` focuses on a narrower problem:

- write in Markdown
- preview the final layout
- export a polished file you can actually send to others

It is not trying to replace note-taking apps, static site generators, or all-in-one writing platforms.

## Use Cases

- Export a technical proposal as a polished HTML page
- Turn a deployment guide into a printable PDF
- Share a README with non-technical teammates
- Prepare tutorial notes, reports, or handoff documents

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run dist
```

## Roadmap

- [x] Markdown editing
- [x] Live preview
- [x] HTML export
- [x] PDF export
- [ ] DOCX export
- [ ] Export templates
- [ ] Front Matter support
- [ ] CLI export mode

## Tech Stack

- Electron
- React
- TypeScript
- CodeMirror 6
- markdown-it
- highlight.js
````
