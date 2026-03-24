export type EditorSnippet = {
  text: string;
  cursorOffset: number;
  statusMessage: string;
};

export type EditorInlineCompletion = {
  text: string;
  selectionStartOffset: number;
  selectionEndOffset: number;
  statusMessage: string;
};

export type EditorEnterCompletion = {
  text: string;
  cursorOffset: number;
};

export function createCodeBlockSnippet(language = "text"): EditorSnippet {
  const header = `\`\`\`${language}`;
  const text = `${header}\n\n\`\`\``;

  return {
    text,
    cursorOffset: header.length + 1,
    statusMessage: `已插入 ${language} 代码块`,
  };
}

export function createTableSnippet(): EditorSnippet {
  const text = "| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |";

  return {
    text,
    cursorOffset: 2,
    statusMessage: "已插入表格模板",
  };
}

export function createTaskListSnippet(): EditorSnippet {
  return {
    text: "- [ ] 待办事项",
    cursorOffset: 6,
    statusMessage: "已插入任务列表",
  };
}

export function createMermaidFlowchartSnippet(): EditorSnippet {
  const header = "```mermaid";
  const diagramType = "flowchart TD";
  const text = `${header}\n${diagramType}\n  A[开始] --> B{条件判断}\n  B -->|是| C[处理步骤]\n  B -->|否| D[备用路径]\n  C --> E[结束]\n  D --> E\n\n\`\`\``;

  return {
    text,
    cursorOffset: header.length + diagramType.length + 2,
    statusMessage: "已插入 Mermaid 流程图",
  };
}

export function createMermaidSequenceSnippet(): EditorSnippet {
  const header = "```mermaid";
  const diagramType = "sequenceDiagram";
  const text = `${header}\n${diagramType}\n  participant U as 用户\n  participant S as 服务\n  U->>S: 发起请求\n  S-->>U: 返回结果\n\n\`\`\``;

  return {
    text,
    cursorOffset: header.length + diagramType.length + 2,
    statusMessage: "已插入 Mermaid 时序图",
  };
}

export function createCalloutSnippet(): EditorSnippet {
  const text = "> [!TIP]\n> ";

  return {
    text,
    cursorOffset: text.length,
    statusMessage: "已插入提示块",
  };
}

export function createDividerSnippet(): EditorSnippet {
  return {
    text: "---",
    cursorOffset: 3,
    statusMessage: "已插入分隔线",
  };
}

export function createImageSnippet(): EditorSnippet {
  return {
    text: "![图片描述](./image.png)",
    cursorOffset: 2,
    statusMessage: "已插入图片模板",
  };
}

export function getEditorSnippet(actionType: string): EditorSnippet | null {
  switch (actionType) {
    case "editor:insert-code-block":
      return createCodeBlockSnippet();
    case "editor:insert-table":
      return createTableSnippet();
    case "editor:insert-task-list":
      return createTaskListSnippet();
    case "editor:insert-mermaid-flowchart":
      return createMermaidFlowchartSnippet();
    case "editor:insert-mermaid-sequence":
      return createMermaidSequenceSnippet();
    case "editor:insert-callout":
      return createCalloutSnippet();
    case "editor:insert-divider":
      return createDividerSnippet();
    case "editor:insert-image":
      return createImageSnippet();
    default:
      return null;
  }
}

export function getInlineMarkdownCompletion(key: string, selectedText: string) {
  if (key === "*" && selectedText.length > 0) {
    return {
      text: `**${selectedText}**`,
      selectionStartOffset: 2,
      selectionEndOffset: 2 + selectedText.length,
      statusMessage: "已包裹粗体语法",
    } satisfies EditorInlineCompletion;
  }

  if (key === "[") {
    if (selectedText.length > 0) {
      return {
        text: `[${selectedText}]()`,
        selectionStartOffset: selectedText.length + 3,
        selectionEndOffset: selectedText.length + 3,
        statusMessage: "已插入链接模板",
      } satisfies EditorInlineCompletion;
    }

    return {
      text: "[]()",
      selectionStartOffset: 1,
      selectionEndOffset: 1,
      statusMessage: "已插入链接模板",
    } satisfies EditorInlineCompletion;
  }

  return null;
}

export function getAutoClosedFenceInsertion(beforeLineText: string, afterLineText = "") {
  if (afterLineText.trim().length > 0) {
    return null;
  }

  const match = beforeLineText.match(/^(\s*)```([A-Za-z0-9_-]+)?\s*$/);
  if (!match) {
    return null;
  }

  const indent = match[1] ?? "";
  return {
    text: `\n\n${indent}\`\`\``,
    cursorOffset: 1,
  } satisfies EditorEnterCompletion;
}

export function getSmartLineContinuation(beforeLineText: string, afterLineText = "") {
  const fencedCodeCompletion = getAutoClosedFenceInsertion(beforeLineText, afterLineText);
  if (fencedCodeCompletion) {
    return fencedCodeCompletion;
  }

  const lineText = `${beforeLineText}${afterLineText}`;

  const taskListMatch = lineText.match(/^(\s*)- \[(?: |x|X)\]\s+(.+)$/);
  if (taskListMatch) {
    return {
      text: `\n${taskListMatch[1]}- [ ] `,
      cursorOffset: taskListMatch[1].length + 6,
    } satisfies EditorEnterCompletion;
  }

  const bulletListMatch = lineText.match(/^(\s*)-\s+(.+)$/);
  if (bulletListMatch) {
    return {
      text: `\n${bulletListMatch[1]}- `,
      cursorOffset: bulletListMatch[1].length + 3,
    } satisfies EditorEnterCompletion;
  }

  const blockquoteMatch = lineText.match(/^(\s*>\s?)(.+)$/);
  if (blockquoteMatch) {
    return {
      text: `\n${blockquoteMatch[1]}`,
      cursorOffset: blockquoteMatch[1].length + 1,
    } satisfies EditorEnterCompletion;
  }

  const headingMatch = lineText.match(/^(\s*#{1,6})\s+(.+)$/);
  if (headingMatch) {
    return {
      text: "\n\n",
      cursorOffset: 1,
    } satisfies EditorEnterCompletion;
  }

  return null;
}
