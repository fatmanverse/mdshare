function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "未知错误";
}

type MermaidErrorDetails = {
  title: string;
  message: string;
  hint: string;
  rawMessage: string;
};

function buildMermaidCodeMarkup(source: string) {
  return `<pre class="hljs mermaid-preview__code"><code class="language-mermaid">${escapeHtml(source)}</code></pre>`;
}

function normalizeMermaidErrorMessage(message: string) {
  return message.replace(/\s*mermaid version\s+.+$/i, "").replace(/\s+/g, " ").trim();
}

const MERMAID_DIAGRAM_TYPES = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "classDiagram-v2",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "gitGraph",
  "mindmap",
  "timeline",
  "quadrantChart",
  "requirementDiagram",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
  "packet-beta",
] as const;

function getFirstMermaidSourceLine(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("%%")) ?? "";
}

function isKnownMermaidDiagramStart(line: string) {
  return MERMAID_DIAGRAM_TYPES.some(
    (diagramType) => line === diagramType || line.startsWith(diagramType + " ") || line.startsWith(diagramType + "	"),
  );
}

function hasUnbalancedMermaidPair(source: string, openToken: string, closeToken: string) {
  let depth = 0;

  for (const character of source) {
    if (character === openToken) {
      depth += 1;
      continue;
    }

    if (character === closeToken) {
      depth -= 1;
      if (depth < 0) {
        return true;
      }
    }
  }

  return depth !== 0;
}

function hasUnbalancedMermaidBrackets(source: string) {
  return [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ].some(([openToken, closeToken]) => hasUnbalancedMermaidPair(source, openToken, closeToken));
}

function containsSuspiciousMermaidArrow(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("%%"))
    .some((line) => /(^|[^-])->(?!>)/.test(line) || /(^|[^=])=>(?!>)/.test(line));
}

function resolveMermaidErrorDetails(error: unknown, source = ""): MermaidErrorDetails {
  const rawMessage = normalizeMermaidErrorMessage(getErrorMessage(error)) || "未知错误";
  const hasParserError = /unknown\s*diagram|no\s+diagram\s+type|diagram\s+type\s+detected|syntax|parse|lexical|expecting|unexpected|got\s+'|got\s+"/i.test(rawMessage);
  const firstLine = getFirstMermaidSourceLine(source);
  const missingDiagramType = firstLine ? !isKnownMermaidDiagramStart(firstLine) : false;
  const hasBracketMismatch = source ? hasUnbalancedMermaidBrackets(source) : false;
  const hasSuspiciousArrow = source ? containsSuspiciousMermaidArrow(source) : false;
  const hasIndentationIssue = /expecting[^.]*\b(newline|semi|eof)\b|indent|dedent|line\s*break/i.test(rawMessage);

  if (/unknown\s*diagram|no\s+diagram\s+type|diagram\s+type\s+detected/i.test(rawMessage)) {
    return {
      title: "未识别 Mermaid 图表类型",
      message: "当前 Mermaid 图表类型无法识别，暂时无法渲染。",
      hint: "请在首行使用 flowchart、sequenceDiagram、classDiagram、stateDiagram-v2、erDiagram 等合法类型关键字。",
      rawMessage,
    };
  }

  if (missingDiagramType && hasParserError) {
    return {
      title: "Mermaid 首行类型声明不正确",
      message: "Mermaid 第一行需要先声明合法的图表类型，当前首行无法被识别。",
      hint: "请把首行改成 flowchart TD、sequenceDiagram、classDiagram、stateDiagram-v2、erDiagram 等标准写法。",
      rawMessage,
    };
  }

  if (hasBracketMismatch && hasParserError) {
    return {
      title: "Mermaid 括号未闭合",
      message: "当前图表里存在未成对的括号，Mermaid 无法继续完成语法解析。",
      hint: "请重点检查 ()、[]、{} 是否成对出现，尤其是节点文本、子图声明和说明文字。",
      rawMessage,
    };
  }

  if (hasSuspiciousArrow && hasParserError) {
    return {
      title: "Mermaid 连线符号不正确",
      message: "当前图表中的节点连线写法不符合 Mermaid 语法要求。",
      hint: "可优先检查是否误写成 -> 或 =>，通常应改为 -->、---、==>、-.-> 等 Mermaid 连线形式。",
      rawMessage,
    };
  }

  if (hasIndentationIssue) {
    return {
      title: "Mermaid 换行或缩进不正确",
      message: "当前 Mermaid 语句之间的换行或缩进层级不符合语法要求。",
      hint: "请把每条语句尽量独立成行，并检查 subgraph、note、activate 等结构的缩进层级。",
      rawMessage,
    };
  }

  if (/(syntax|parse|lexical) error/i.test(rawMessage)) {
    return {
      title: "Mermaid 语法有误",
      message: "当前 Mermaid 语法无法解析，已直接显示错误提示并停止渲染。",
      hint: "请重点检查箭头连接、节点括号、关键字拼写、缩进以及换行结构是否完整。",
      rawMessage,
    };
  }

  if (/expecting|unexpected|got\s+'|got\s+"/i.test(rawMessage)) {
    return {
      title: "Mermaid 结构不完整",
      message: "当前图表结构不符合 Mermaid 语法要求，暂时无法生成图形。",
      hint: "可重点检查节点名称、连线符号、分隔符以及相邻语句之间的换行位置。",
      rawMessage,
    };
  }

  return {
    title: "Mermaid 渲染失败",
    message: "当前 Mermaid 内容暂时无法渲染，已改为直接展示错误信息。",
    hint: "请检查图表语法，或先简化内容后逐步恢复复杂节点与连线。",
    rawMessage,
  };
}

function buildMermaidErrorMarkup(error: MermaidErrorDetails) {
  return [
    '<div class="mermaid-preview__error" role="alert">',
    `<strong class="mermaid-preview__error-title">${escapeHtml(error.title)}</strong>`,
    `<span class="mermaid-preview__error-message">${escapeHtml(error.message)}</span>`,
    `<span class="mermaid-preview__error-hint">${escapeHtml(error.hint)}</span>`,
    "</div>",
  ].join("");
}

function decodeMermaidSource(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractMermaidSvgErrorMessage(svg: string) {
  const textContent = svg
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (!/(syntax|parse|lexical) error/i.test(textContent)) {
    return null;
  }

  return textContent.replace(/\s*mermaid version\s+.+$/i, "").trim() || textContent;
}

type MermaidTheme = "light" | "dark";
type MermaidDiagramLayout = "compact" | "standard" | "wide" | "tall";

type MermaidRenderer = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
};

type MermaidDiagramMetrics = {
  naturalWidth: number;
  naturalHeight: number;
  fitWidth: number;
  layout: MermaidDiagramLayout;
  preserveAspectRatio: "xMidYMin meet" | "xMinYMin meet";
};

function getMermaidThemeVariables(theme: MermaidTheme) {
  if (theme === "dark") {
    return {
      darkMode: true,
      background: "#020617",
      mainBkg: "#0f172a",
      secondBkg: "#111827",
      primaryColor: "#0f172a",
      secondaryColor: "#111827",
      tertiaryColor: "#172033",
      primaryTextColor: "#e2e8f0",
      secondaryTextColor: "#e2e8f0",
      tertiaryTextColor: "#e2e8f0",
      textColor: "#e2e8f0",
      lineColor: "#94a3b8",
      primaryBorderColor: "#334155",
      secondaryBorderColor: "#334155",
      tertiaryBorderColor: "#475569",
      nodeBorder: "#334155",
      clusterBkg: "#111827",
      clusterBorder: "#334155",
      defaultLinkColor: "#94a3b8",
      titleColor: "#e2e8f0",
      edgeLabelBackground: "#0f172a",
      actorBkg: "#0f172a",
      actorBorder: "#334155",
      actorTextColor: "#e2e8f0",
      labelBoxBkgColor: "#0f172a",
      labelTextColor: "#e2e8f0",
      signalColor: "#e2e8f0",
      signalTextColor: "#e2e8f0",
      sequenceNumberColor: "#0f172a",
      noteBkgColor: "#1e293b",
      noteTextColor: "#e2e8f0",
      activationBorderColor: "#475569",
      activationBkgColor: "#172033",
      classText: "#e2e8f0",
      fontSize: "14px",
    };
  }

  return {
    darkMode: false,
    background: "#ffffff",
    mainBkg: "#ffffff",
    secondBkg: "#f8fafc",
    primaryColor: "#ffffff",
    secondaryColor: "#f8fafc",
    tertiaryColor: "#eef2ff",
    primaryTextColor: "#0f172a",
    secondaryTextColor: "#0f172a",
    tertiaryTextColor: "#0f172a",
    textColor: "#0f172a",
    lineColor: "#475569",
    primaryBorderColor: "#cbd5e1",
    secondaryBorderColor: "#cbd5e1",
    tertiaryBorderColor: "#94a3b8",
    nodeBorder: "#cbd5e1",
    clusterBkg: "#f8fafc",
    clusterBorder: "#cbd5e1",
    defaultLinkColor: "#475569",
    titleColor: "#0f172a",
    edgeLabelBackground: "#ffffff",
    actorBkg: "#ffffff",
    actorBorder: "#cbd5e1",
    actorTextColor: "#0f172a",
    labelBoxBkgColor: "#ffffff",
    labelTextColor: "#0f172a",
    signalColor: "#0f172a",
    signalTextColor: "#0f172a",
    sequenceNumberColor: "#ffffff",
    noteBkgColor: "#fef3c7",
    noteTextColor: "#0f172a",
    activationBorderColor: "#94a3b8",
    activationBkgColor: "#e2e8f0",
    classText: "#0f172a",
    fontSize: "14px",
  };
}

function parseMermaidViewBox(viewBoxValue: string | null) {
  if (!viewBoxValue) {
    return null;
  }

  const numbers = viewBoxValue
    .trim()
    .split(/\s+/)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));

  if (numbers.length !== 4) {
    return null;
  }

  const [, , width, height] = numbers;
  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    width,
    height,
  };
}

function resolveMermaidDiagramMetrics(viewBoxValue: string | null): MermaidDiagramMetrics | null {
  const viewBox = parseMermaidViewBox(viewBoxValue);
  if (!viewBox) {
    return null;
  }

  const naturalWidth = Math.round(viewBox.width);
  const naturalHeight = Math.round(viewBox.height);
  const aspectRatio = viewBox.width / viewBox.height;

  let layout: MermaidDiagramLayout = "standard";
  if (viewBox.width >= 1400 || aspectRatio >= 2.4) {
    layout = "wide";
  } else if (viewBox.height >= 1000 || aspectRatio <= 0.9) {
    layout = "tall";
  } else if (viewBox.width <= 420) {
    layout = "compact";
  }

  const fitWidthLimit = layout === "wide" ? 1200 : layout === "tall" ? 860 : layout === "compact" ? 420 : 960;

  return {
    naturalWidth,
    naturalHeight,
    fitWidth: Math.round(Math.min(viewBox.width, fitWidthLimit)),
    layout,
    preserveAspectRatio: layout === "wide" ? "xMinYMin meet" : "xMidYMin meet",
  };
}

let mermaidModulePromise: Promise<MermaidRenderer> | null = null;
let mermaidRenderSequence = 0;

async function loadMermaidModule(): Promise<MermaidRenderer> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((module) => module.default as MermaidRenderer);
  }

  return mermaidModulePromise;
}

async function getMermaidRenderer(theme: MermaidTheme) {
  const mermaid = await loadMermaidModule();

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    themeVariables: getMermaidThemeVariables(theme),
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
    },
  });

  return mermaid;
}

function applyMermaidDiagramLayout(block: HTMLElement, diagramElement: HTMLElement) {
  const svg = diagramElement.querySelector<SVGElement>("svg");
  if (!svg) {
    return;
  }

  const metrics = resolveMermaidDiagramMetrics(svg.getAttribute("viewBox"));
  svg.removeAttribute("width");
  svg.removeAttribute("height");

  if (!metrics) {
    delete block.dataset.mermaidLayout;
    block.style.removeProperty("--mermaid-fit-width");
    block.style.removeProperty("--mermaid-natural-width");
    svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
    return;
  }

  block.dataset.mermaidLayout = metrics.layout;
  block.style.setProperty("--mermaid-fit-width", `${metrics.fitWidth}px`);
  block.style.setProperty("--mermaid-natural-width", `${metrics.naturalWidth}px`);
  svg.setAttribute("preserveAspectRatio", metrics.preserveAspectRatio);
}

async function renderMermaidBlock(block: HTMLElement, theme: MermaidTheme) {
  const encodedSource = block.dataset.mermaidSource;
  if (!encodedSource) {
    return;
  }

  const source = decodeMermaidSource(encodedSource);
  if (!source.trim()) {
    return;
  }

  const renderKey = `${theme}:${encodedSource}`;
  if (block.dataset.mermaidRendered === renderKey) {
    return;
  }

  try {
    const mermaid = await getMermaidRenderer(theme);
    mermaidRenderSequence += 1;
    const { svg, bindFunctions } = await mermaid.render(`mdshare-mermaid-${mermaidRenderSequence}`, source);
    const svgErrorMessage = extractMermaidSvgErrorMessage(svg);
    if (svgErrorMessage) {
      throw new Error(svgErrorMessage);
    }

    block.innerHTML = `<div class="mermaid-preview__diagram">${svg}</div>`;
    block.dataset.mermaidRendered = renderKey;
    block.dataset.mermaidState = "diagram";
    delete block.dataset.mermaidError;

    const diagramElement = block.querySelector<HTMLElement>(".mermaid-preview__diagram");
    if (diagramElement) {
      bindFunctions?.(diagramElement);
      applyMermaidDiagramLayout(block, diagramElement);
    }
  } catch (error) {
    const errorDetails = resolveMermaidErrorDetails(error, source);
    block.innerHTML = buildMermaidErrorMarkup(errorDetails);
    block.dataset.mermaidRendered = "";
    block.dataset.mermaidState = "error";
    block.dataset.mermaidError = errorDetails.rawMessage;
    delete block.dataset.mermaidLayout;
    block.style.removeProperty("--mermaid-fit-width");
    block.style.removeProperty("--mermaid-natural-width");
  }
}

function getMermaidBlocks(container: ParentNode) {
  return Array.from(container.querySelectorAll<HTMLElement>(".mermaid-preview[data-mermaid-source]"));
}

export function renderMermaidPreview(source: string) {
  if (!source.trim()) {
    return null;
  }

  return `<div class="mermaid-preview" data-mermaid-source="${encodeURIComponent(source)}" data-mermaid-state="source">${buildMermaidCodeMarkup(source)}</div>`;
}

export async function renderMermaidDiagrams(container: ParentNode, theme: MermaidTheme) {
  const mermaidBlocks = getMermaidBlocks(container);
  if (mermaidBlocks.length === 0) {
    return;
  }

  for (const block of mermaidBlocks) {
    await renderMermaidBlock(block, theme);
  }
}

export async function renderMermaidHtml(html: string, theme: MermaidTheme) {
  if (!html.includes("data-mermaid-source=")) {
    return html;
  }

  if (typeof document === "undefined") {
    return html;
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  await renderMermaidDiagrams(container, theme);
  return container.innerHTML;
}

export { buildMermaidErrorMarkup, extractMermaidSvgErrorMessage, getMermaidThemeVariables, resolveMermaidDiagramMetrics, resolveMermaidErrorDetails };
