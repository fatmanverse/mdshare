export type RenderStyle = "default" | "compact" | "article";

export type RenderStyleOption = {
  value: RenderStyle;
  label: string;
  description: string;
};

type RenderStylePreset = {
  blockGap: string;
  contentMaxWidth: string;
  contentPadding: string;
  heading1: string;
  heading2: string;
  heading3: string;
  heading4: string;
  imageRadius: string;
  imageShadow: string;
  lineHeight: string;
  pageMaxWidth: string;
  pagePadding: string;
  tocWidth: string;
};

export const RENDER_STYLE_OPTIONS: RenderStyleOption[] = [
  {
    value: "default",
    label: "Default",
    description: "平衡预览密度与导出观感",
  },
  {
    value: "compact",
    label: "Compact",
    description: "更紧凑，适合流程文档与说明书",
  },
  {
    value: "article",
    label: "Article",
    description: "更聚焦阅读，适合长文与分享稿",
  },
];

const RENDER_STYLE_PRESETS: Record<RenderStyle, RenderStylePreset> = {
  default: {
    blockGap: "16px",
    contentMaxWidth: "100%",
    contentPadding: "24px",
    heading1: "clamp(2rem, 4.2vw, 2.125rem)",
    heading2: "clamp(1.65rem, 3.4vw, 1.75rem)",
    heading3: "clamp(1.3rem, 2.7vw, 1.375rem)",
    heading4: "clamp(1.1rem, 2.1vw, 1.125rem)",
    imageRadius: "16px",
    imageShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
    lineHeight: "1.8",
    pageMaxWidth: "1200px",
    pagePadding: "48px 32px 80px",
    tocWidth: "240px",
  },
  compact: {
    blockGap: "12px",
    contentMaxWidth: "100%",
    contentPadding: "20px",
    heading1: "clamp(1.75rem, 3.8vw, 1.95rem)",
    heading2: "clamp(1.45rem, 3vw, 1.55rem)",
    heading3: "clamp(1.2rem, 2.3vw, 1.25rem)",
    heading4: "clamp(1.05rem, 2vw, 1.1rem)",
    imageRadius: "14px",
    imageShadow: "0 10px 22px rgba(15, 23, 42, 0.14)",
    lineHeight: "1.68",
    pageMaxWidth: "1080px",
    pagePadding: "36px 24px 56px",
    tocWidth: "220px",
  },
  article: {
    blockGap: "18px",
    contentMaxWidth: "780px",
    contentPadding: "28px",
    heading1: "clamp(2.15rem, 4.8vw, 2.4rem)",
    heading2: "clamp(1.75rem, 3.6vw, 1.95rem)",
    heading3: "clamp(1.38rem, 2.8vw, 1.5rem)",
    heading4: "clamp(1.15rem, 2.2vw, 1.2rem)",
    imageRadius: "18px",
    imageShadow: "0 16px 34px rgba(15, 23, 42, 0.18)",
    lineHeight: "1.92",
    pageMaxWidth: "1280px",
    pagePadding: "56px 32px 96px",
    tocWidth: "250px",
  },
};

export function isRenderStyle(value: string | null | undefined): value is RenderStyle {
  return value === "default" || value === "compact" || value === "article";
}

export function getRenderStylePreset(renderStyle: RenderStyle) {
  return RENDER_STYLE_PRESETS[renderStyle];
}

export function buildRenderStyleCssVariables(renderStyle: RenderStyle) {
  const preset = getRenderStylePreset(renderStyle);

  return {
    "--mdshare-block-gap": preset.blockGap,
    "--mdshare-content-max-width": preset.contentMaxWidth,
    "--mdshare-preview-padding": preset.contentPadding,
    "--mdshare-h1-size": preset.heading1,
    "--mdshare-h2-size": preset.heading2,
    "--mdshare-h3-size": preset.heading3,
    "--mdshare-h4-size": preset.heading4,
    "--mdshare-image-radius": preset.imageRadius,
    "--mdshare-image-shadow": preset.imageShadow,
    "--mdshare-line-height": preset.lineHeight,
    "--mdshare-page-max-width": preset.pageMaxWidth,
    "--mdshare-page-padding": preset.pagePadding,
    "--mdshare-toc-width": preset.tocWidth,
  } satisfies Record<string, string>;
}

export function buildRenderStyleCssVariableText(renderStyle: RenderStyle) {
  return Object.entries(buildRenderStyleCssVariables(renderStyle))
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n        ");
}
