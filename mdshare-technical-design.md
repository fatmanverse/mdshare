# Markdown 发布客户端技术设计

## 1. 文档目标

这份文档用于定义 `mdshare` 桌面端 MVP 的实现方案，重点回答：

- 为什么这样选技术栈
- 核心模块怎么拆
- 文件、预览、导出怎么串起来
- 首版应该实现到什么程度

## 2. 技术结论

MVP 推荐技术栈如下：

- 桌面框架：`Electron`
- 前端框架：`React + Vite + TypeScript`
- 编辑器：`CodeMirror 6`
- 状态管理：`Zustand`
- Markdown 解析：`markdown-it`
- 代码高亮：`highlight.js`
- 样式方案：CSS Variables + 少量原生 CSS
- 打包：`electron-builder`
- 单元测试：`Vitest`
- 端到端测试：`Playwright`

## 3. 选型原因

### 3.1 为什么 MVP 选 `Electron`

本项目的核心卖点是导出成品，而不是单纯编辑体验。

如果首版就要求：

- 稳定文件读写
- 本地导出 HTML
- 本地导出 PDF
- 处理打印样式和窗口控制

那么 `Electron` 在 MVP 阶段更稳妥。

核心原因：

- `printToPDF` 能力成熟
- 文件系统访问模型直观
- 桌面端生态完整
- 示例和社区资料更多

`Tauri` 也能做，但如果把 `PDF` 作为 P0，首版实现复杂度会更高。

### 3.2 为什么编辑器选 `CodeMirror 6`

- 面向纯文本编辑场景足够成熟
- 可控性高
- 体积比 `Monaco` 更适合轻量桌面工具
- 语法高亮、快捷键、扩展能力完善

### 3.3 为什么渲染层选 `markdown-it`

- 生态成熟
- 插件丰富
- 定制目录、锚点、图片处理较方便
- 适合做“预览”和“导出”共用的一套渲染链

## 4. 系统边界

### 4.1 MVP 支持

- 新建 Markdown
- 打开/保存本地 `.md`
- 左写右看实时预览
- 目录生成
- 主题切换
- 导出 `HTML`
- 导出 `PDF`
- 自动保存草稿
- 最近文件

### 4.2 MVP 不支持

- 多文档标签管理
- 云同步
- 协同编辑
- 插件市场
- 富文本模式
- `DOCX` / `EPUB`

## 5. 架构总览

整体采用标准三层结构：

- `Main Process`：桌面能力、窗口管理、文件系统、导出
- `Preload`：安全桥接，暴露白名单 IPC
- `Renderer`：编辑器 UI、预览 UI、状态管理

数据流如下：

1. 用户在编辑区输入 Markdown
2. Renderer 更新内存中的文档状态
3. 渲染管线把 Markdown 转成可预览 HTML
4. 用户触发保存或导出
5. Renderer 调用 Preload 暴露的 API
6. Main Process 完成文件写入或 PDF 生成

## 6. 目录结构建议

建议工程结构如下：

```text
mdshare/
  electron/
    main/
      index.ts
      windows.ts
      ipc/
        file.ts
        export.ts
        app.ts
      services/
        recent-files.ts
        export-html.ts
        export-pdf.ts
    preload/
      index.ts
      types.ts
  src/
    app/
      App.tsx
      routes.tsx
      store/
        document-store.ts
        app-store.ts
    components/
      EditorPane.tsx
      PreviewPane.tsx
      TocPanel.tsx
      Toolbar.tsx
      StatusBar.tsx
    features/
      editor/
      preview/
      export/
      theme/
      files/
    lib/
      markdown/
        parser.ts
        toc.ts
        sanitize.ts
        template.ts
      storage/
      utils/
    styles/
      globals.css
      themes.css
      print.css
    types/
      document.ts
      export.ts
  public/
  scripts/
  README.md
```

## 7. 核心模块设计

### 7.1 文档状态模块

负责内容：

- 当前文件路径
- 文档原始 Markdown 内容
- 是否已保存
- 最近自动保存时间
- 当前导出主题

建议类型：

```ts
type DocumentState = {
  filePath: string | null;
  title: string;
  content: string;
  isDirty: boolean;
  lastSavedAt: number | null;
  lastAutosavedAt: number | null;
  exportTheme: "light" | "dark";
};
```

### 7.2 编辑器模块

职责：

- 初始化 `CodeMirror`
- 同步编辑内容到状态层
- 处理快捷键
- 处理拖拽文本和粘贴

MVP 不做复杂能力：

- Vim 模式
- 多光标高级功能
- 富文本模式

### 7.3 Markdown 渲染模块

职责：

- 把 Markdown 文本转成 HTML
- 生成目录树
- 处理标题锚点
- 处理代码块高亮
- 解析图片路径

建议将预览和导出统一走这套核心渲染管线，避免：

- 预览效果和导出效果不一致
- 两套模板各自维护

### 7.4 HTML 导出模块

职责：

- 把当前文档渲染为完整 HTML 页面
- 内联样式
- 注入主题
- 注入目录和代码高亮样式
- 生成最终字符串并写入磁盘

输出结果要求：

- 双击即可打开
- 离线可用
- 不依赖外部 CDN

### 7.5 PDF 导出模块

职责：

- 根据当前文档生成专门的打印页面
- 使用 `BrowserWindow.webContents.printToPDF`
- 输出最终 PDF 文件

这里建议不要直接对编辑窗口截图或粗暴打印，而是：

- 创建一个专门的导出页面
- 注入打印专用样式
- 等待页面资源渲染完成
- 再调用 PDF 导出

这样更容易保证：

- 页边距稳定
- 标题分页更自然
- 代码块和表格不乱

### 7.6 文件系统模块

职责：

- 打开本地 Markdown 文件
- 保存当前文档
- 另存为
- 记录最近文件

要求：

- 所有文件系统访问只在 `Main Process` 执行
- Renderer 不直接拿 Node API

### 7.7 自动保存模块

职责：

- 定时保存未落盘草稿
- 在应用异常退出后恢复内容

建议机制：

- 每次编辑后 debounce `800ms`
- 将草稿写入本地应用数据目录
- 按文件路径或临时文档 ID 存储

## 8. Renderer 端页面结构

主界面拆成 5 个区域：

- `Toolbar`
- `EditorPane`
- `PreviewPane`
- `TocPanel`
- `StatusBar`

布局建议：

- 左右分栏
- 默认 `45 / 55`
- 支持拖动调整宽度

## 9. IPC 设计

建议只开放最少量 API。

### 9.1 暴露给 Renderer 的 API

- `openFile()`
- `saveFile(payload)`
- `saveFileAs(payload)`
- `exportHtml(payload)`
- `exportPdf(payload)`
- `getRecentFiles()`
- `openRecentFile(path)`
- `readRecoveryDraft()`
- `saveRecoveryDraft(payload)`

### 9.2 IPC 原则

- 白名单通道
- 参数做 schema 校验
- 不把任意路径读写能力直接暴露给 Renderer
- 不开启 `nodeIntegration`
- 开启 `contextIsolation`

## 10. 关键数据流

### 10.1 打开文件

1. 用户点击“打开”
2. Renderer 调用 `openFile`
3. Main 弹出文件选择框
4. 读取 `.md` 文件内容
5. 返回内容、路径、推断标题
6. Renderer 更新状态并触发预览渲染

### 10.2 保存文件

1. 用户点击“保存”
2. 若 `filePath` 存在，直接覆盖
3. 若 `filePath` 不存在，走 `saveFileAs`
4. Main 写入磁盘
5. Renderer 更新 `isDirty` 与 `lastSavedAt`

### 10.3 导出 HTML

1. 用户点击“导出 HTML”
2. Renderer 调用渲染管线生成导出 HTML
3. Renderer 通过 IPC 传给 Main
4. Main 弹出保存对话框
5. Main 将 HTML 写入目标路径

### 10.4 导出 PDF

1. 用户点击“导出 PDF”
2. Renderer 生成导出所需的数据模型
3. Main 打开隐藏导出窗口
4. 导出窗口加载打印模板页
5. 注入文档内容和样式
6. 等待渲染稳定
7. 调用 `printToPDF`
8. 保存 PDF 文件并关闭隐藏窗口

## 11. Markdown 渲染设计

渲染流程建议：

1. 原始 Markdown 文本输入
2. 解析 Front Matter（首版可选）
3. `markdown-it` 转 HTML
4. 对标题生成 slug
5. 生成目录树
6. 对代码块应用高亮
7. 对图片链接进行路径修正
8. 输出预览 HTML 与导出 HTML

建议预留以下扩展点：

- 数学公式
- Mermaid
- 自定义容器块

但首版默认不打开。

## 12. 图片与资源处理

这是桌面端比较容易踩坑的地方。

### 12.1 预览阶段

- 相对路径图片按当前 Markdown 文件所在目录解析
- 未保存新文档时，相对路径图片只做提示，不强行猜目录

### 12.2 HTML 导出阶段

MVP 建议支持两种策略：

- 默认：把本地图片转成 `data:` URI 内联
- 备选：复制资源到同级目录

首版建议直接内联图片，优点是：

- 导出的 HTML 真正单文件
- 用户转发更简单

### 12.3 PDF 导出阶段

- 导出页直接使用已解析后的本地资源路径或内联数据
- 避免打印时资源丢失

## 13. 主题系统

建议首版只做两套主题：

- `light`
- `dark`

主题包括：

- 编辑器主题
- 预览主题
- 导出主题

要求：

- 编辑区和导出结果风格尽量一致
- 预览主题切换后，导出默认沿用当前主题

## 14. 错误处理

需要明确处理这些情况：

- 打开非 Markdown 文件
- 本地文件编码异常
- 保存路径无权限
- PDF 导出失败
- 图片路径失效
- 大文档渲染卡顿

界面反馈原则：

- 有明确报错提示
- 告诉用户失败在哪一步
- 尽量保留当前编辑内容

## 15. 性能策略

MVP 不做过度优化，但要避免明显卡顿。

建议：

- 预览渲染做 debounce，默认 `150ms`
- 目录生成与 Markdown 渲染共用一次解析结果
- 自动保存做 debounce，默认 `800ms`
- 对超大文档预留降级策略

## 16. 安全策略

桌面应用安全原则必须明确：

- 禁用 `nodeIntegration`
- 开启 `contextIsolation`
- Renderer 不直接访问文件系统
- 不执行 Markdown 内嵌脚本
- 导出 HTML 默认做基础 sanitize

注意：

本产品是本地工具，不以“渲染任意不可信远程网页”为目标，但仍需避免把 Markdown 渲染成可执行脚本页面。

## 17. 测试策略

### 17.1 单元测试

重点覆盖：

- Markdown 转 HTML
- 目录生成
- 文件路径解析
- 导出模板拼装

### 17.2 集成测试

重点覆盖：

- 打开文件
- 保存文件
- 自动保存恢复
- 导出 HTML

### 17.3 端到端测试

重点覆盖：

- 从打开应用到导出成品的主流程
- 主题切换后导出结果正确
- PDF 导出成功

## 18. 发布策略

MVP 建议先支持：

- `macOS`
- `Windows`

发布形式：

- GitHub Release
- 提供安装包和免安装包

版本节奏建议：

- `v0.1.0`：编辑、预览、HTML 导出
- `v0.2.0`：PDF 导出、最近文件、恢复草稿
- `v0.3.0`：主题增强、目录和打印体验优化

## 19. 当前最大技术风险

### 19.1 PDF 版式稳定性

风险：

- 表格过宽
- 长代码块分页差
- 图片尺寸不稳定

应对：

- 优先定义打印样式
- 先服务常见技术文档场景
- 首版不追求覆盖所有极端排版

### 19.2 本地图片路径

风险：

- 新建未保存文件时图片相对路径不确定

应对：

- 明确提示用户先保存文档
- 提供图片解析失败状态

### 19.3 预览与导出不一致

风险：

- 预览用一套渲染逻辑，导出再拼另一套逻辑

应对：

- 强制预览和导出共用同一套 Markdown 渲染核心

## 20. 最终实现建议

首版最稳的实现路线是：

- 先把 Markdown 编辑、预览、HTML 导出做扎实
- 再补 PDF 导出
- 保持边界简单，不提前做 `DOCX`
- 用 `Electron` 把“成品导出能力”优先跑通

一句话总结：

MVP 的技术重点不是编辑器花样，而是“本地文件 + 稳定导出 + 一致渲染”。
