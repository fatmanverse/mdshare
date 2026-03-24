# mdshare

> Local-first, export-first Markdown publisher for polished HTML and PDF delivery.

把 Markdown 更快整理成漂亮、稳定、可直接发送的 HTML / PDF 成品。

## Overview

`mdshare` 是一个本地优先、导出优先的 Markdown 桌面工具。

它不试图做更大的笔记系统，也不强调复杂的格式转换链路，而是专注一件事：**让你写完 Markdown 之后，更快交付一份像成品的文档。**

## Why mdshare

很多 Markdown 工具更偏向以下几类能力：

- 更顺手的编辑体验
- 更庞大的知识管理系统
- 更复杂的格式转换能力

但在真实工作里，经常还有一个更具体的需求：

> 文档已经写完了，怎样快速确认效果，并稳定导出成可以直接发给同事、客户或团队成员的成品？

`mdshare` 给出的路径是：**边编辑、边预览、边收敛到最终成品效果，然后一键导出 HTML / PDF。**

## Highlights

### 1. 预览更接近最终交付结果

不是只看“Markdown 大概长什么样”，而是尽量在编辑过程中就看到更接近最终导出结果的排版效果，减少导出后返工。

### 2. 导出预设减少重复调样式

同一份内容可以根据场景快速切换导出风格：

- 默认文档
- 流程 SOP
- 分享长文

不需要每次都重新调整字体、间距、目录、标题块或整体版式。

### 3. 对技术文档更友好

项目围绕交付质量处理了很多技术文档常见元素：

- 代码块高亮
- Mermaid 图表
- 标题锚点与目录
- 图片展示与导出
- `TIP / NOTE / WARNING / IMPORTANT / CAUTION` Callout

### 4. 导出前先做健康检查

在真正导出之前，先识别一些常见结构和内容问题，降低“发出去才发现格式不对”的风险。

### 5. 本地优先，保持轻量工作流

最近文件、草稿恢复、设置持久化都在本地完成，更适合高频写作、反复修改和快速交付的真实场景。

## Best For

`mdshare` 更适合这些角色：

- 开发者
- 产品经理
- 运维 / 交付工程师
- 技术写作者
- 经常需要把 Markdown 直接发给别人阅读的人

尤其适合这些内容类型：

- 技术方案与项目说明
- SOP / 操作手册 / 内部流程文档
- 分享文章、复盘、周报
- 需要导出 HTML / PDF 的单篇 Markdown 文档

## Workflow

1. 用 Markdown 编写内容
2. 实时查看接近成品的预览效果
3. 检查目录、代码块、图片、Callout、Mermaid 等内容表现
4. 一键导出 HTML / PDF，直接发送或归档

## Comparison

| 工具 | 更擅长什么 | `mdshare` 的关注点 |
| --- | --- | --- |
| Typora | 更顺滑的写作体验 | 更强调“写完即可交付”的结果导向 |
| Pandoc | 更强的多格式转换能力 | 更强调开箱即用的预览与导出体验 |
| Obsidian | 更完整的知识管理与插件生态 | 更聚焦单篇文档的成品化与交付 |

一句话总结：

- Typora：把 Markdown 写得更舒服
- Pandoc：把文档格式转得更强
- Obsidian：把 Markdown 管得更深
- `mdshare`：把 Markdown 更快交付成品

## Feature Snapshot

- Markdown 文件的新建、打开、保存、另存为
- 左侧编辑、右侧实时预览
- HTML / PDF 一键导出
- 导出预设与阅读风格切换
- 标题锚点与目录生成
- 代码块高亮与技术内容优化
- Mermaid 图表预览与导出
- `TIP / NOTE / WARNING / IMPORTANT / CAUTION` Callout 渲染
- 图片查看与导出处理
- 最近文件、拖拽打开、自动保存、草稿恢复
- 深色 / 浅色主题切换
- 导出前健康检查

## Non-goals

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

## Related Docs

- 快速开始与命令说明：`README.md`
- 项目介绍：`docs/project-introduction.md`

## Closing Note

如果你需要的不是更大的笔记系统，也不是更复杂的转换引擎，而是一条更短、更稳的 Markdown 交付路径，那么 `mdshare` 会更直接。
