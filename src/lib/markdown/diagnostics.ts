import type { TocItem } from "./parser";

export type DocumentDiagnosticSeverity = "error" | "warning" | "info";
export type DocumentDiagnosticKind =
  | "missing-image"
  | "unsaved-local-image"
  | "duplicate-heading"
  | "heading-level-skip"
  | "code-block-missing-language"
  | "large-inline-image";

export type DocumentDiagnostic = {
  id: string;
  kind: DocumentDiagnosticKind;
  severity: DocumentDiagnosticSeverity;
  title: string;
  description: string;
  line: number | null;
  source?: string;
  headingId?: string;
};

type ImageReference = {
  alt: string;
  source: string;
  line: number;
};

type CodeFenceReference = {
  language: string;
  line: number;
};

type BuildDocumentDiagnosticsOptions = {
  markdown: string;
  toc: TocItem[];
  markdownFilePath: string | null;
  missingImageSources?: string[];
};

const EXTERNAL_SOURCE_PATTERN = /^(https?:|data:|blob:|file:|mailto:)/i;
const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)]+)\)/g;
const CODE_FENCE_PATTERN = /^```\s*([^\s`]*)\s*$/gm;

function normalizeDiagnosticId(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function getLineNumber(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

export function extractMarkdownImages(markdown: string) {
  const images: ImageReference[] = [];

  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const matchedText = match[0] ?? "";
    const alt = match[1] ?? "";
    const rawSource = match[2] ?? "";
    const source = rawSource.trim().replace(/^<|>$/g, "").replace(/\s+".*"$/, "");
    const line = getLineNumber(markdown, match.index ?? markdown.indexOf(matchedText));

    images.push({ alt, source, line });
  }

  return images;
}

export function extractMarkdownCodeFences(markdown: string) {
  const fences: CodeFenceReference[] = [];
  let insideFence = false;

  for (const match of markdown.matchAll(CODE_FENCE_PATTERN)) {
    if (insideFence) {
      insideFence = false;
      continue;
    }

    const line = getLineNumber(markdown, match.index ?? 0);
    fences.push({
      language: (match[1] ?? "").trim(),
      line,
    });
    insideFence = true;
  }

  return fences;
}

export function getLocalImageSources(markdown: string) {
  return extractMarkdownImages(markdown).filter((image) => image.source && !EXTERNAL_SOURCE_PATTERN.test(image.source));
}

export function buildDocumentDiagnostics(options: BuildDocumentDiagnosticsOptions) {
  const diagnostics: DocumentDiagnostic[] = [];
  const missingSourceSet = new Set(options.missingImageSources ?? []);
  const headingTextMap = new Map<string, TocItem[]>();

  for (const heading of options.toc) {
    const key = heading.text.trim();
    if (!key) {
      continue;
    }

    const collection = headingTextMap.get(key) ?? [];
    collection.push(heading);
    headingTextMap.set(key, collection);
  }

  headingTextMap.forEach((items, text) => {
    if (items.length < 2) {
      return;
    }

    items.forEach((item, index) => {
      diagnostics.push({
        id: `duplicate-heading-${normalizeDiagnosticId(text)}-${index + 1}`,
        kind: "duplicate-heading",
        severity: "warning",
        title: `标题重复：${text}`,
        description: "重复标题会影响目录辨识度，也容易让导出后的锚点阅读体验变差。",
        line: item.line + 1,
        headingId: item.id,
      });
    });
  });

  for (let index = 1; index < options.toc.length; index += 1) {
    const previous = options.toc[index - 1];
    const current = options.toc[index];
    if (current.level - previous.level <= 1) {
      continue;
    }

    diagnostics.push({
      id: `heading-level-skip-${current.id}`,
      kind: "heading-level-skip",
      severity: "warning",
      title: `标题层级跳跃：${previous.text} → ${current.text}`,
      description: `当前从 H${previous.level} 直接跳到 H${current.level}，建议逐级组织标题结构。`,
      line: current.line + 1,
      headingId: current.id,
    });
  }

  extractMarkdownCodeFences(options.markdown).forEach((fence, index) => {
    if (fence.language) {
      return;
    }

    diagnostics.push({
      id: `code-block-missing-language-${index + 1}`,
      kind: "code-block-missing-language",
      severity: "info",
      title: "代码块未声明语言",
      description: "为代码块补充语言标记有助于高亮、导出与后续分享展示。",
      line: fence.line,
    });
  });

  extractMarkdownImages(options.markdown).forEach((image, index) => {
    if (!image.source) {
      return;
    }

    if (image.source.startsWith("data:") && image.source.length > 200_000) {
      diagnostics.push({
        id: `large-inline-image-${index + 1}`,
        kind: "large-inline-image",
        severity: "info",
        title: "检测到较大的内嵌图片",
        description: "内嵌 data URL 会让 Markdown 体积快速膨胀，建议保存为本地 assets 文件。",
        line: image.line,
        source: image.source,
      });
      return;
    }

    if (EXTERNAL_SOURCE_PATTERN.test(image.source)) {
      return;
    }

    if (!options.markdownFilePath) {
      diagnostics.push({
        id: `unsaved-local-image-${normalizeDiagnosticId(image.source)}-${index + 1}`,
        kind: "unsaved-local-image",
        severity: "warning",
        title: `暂时无法校验图片：${image.source}`,
        description: "当前文档尚未保存，本地相对路径图片无法做存在性校验。",
        line: image.line,
        source: image.source,
      });
      return;
    }

    if (missingSourceSet.has(image.source)) {
      diagnostics.push({
        id: `missing-image-${normalizeDiagnosticId(image.source)}-${index + 1}`,
        kind: "missing-image",
        severity: "error",
        title: `图片不存在：${image.source}`,
        description: "导出时这张图片无法被正确收集，请检查路径或资源文件是否存在。",
        line: image.line,
        source: image.source,
      });
    }
  });

  return diagnostics.sort((left, right) => {
    const severityOrder: Record<DocumentDiagnosticSeverity, number> = {
      error: 0,
      warning: 1,
      info: 2,
    };

    if (severityOrder[left.severity] !== severityOrder[right.severity]) {
      return severityOrder[left.severity] - severityOrder[right.severity];
    }

    return (left.line ?? Number.MAX_SAFE_INTEGER) - (right.line ?? Number.MAX_SAFE_INTEGER);
  });
}

export function summarizeDiagnostics(diagnostics: DocumentDiagnostic[]) {
  return diagnostics.reduce(
    (summary, diagnostic) => {
      summary.total += 1;
      summary[diagnostic.severity] += 1;
      return summary;
    },
    {
      total: 0,
      error: 0,
      warning: 0,
      info: 0,
    },
  );
}
