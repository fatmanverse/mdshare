function normalizeImageMimeType(mimeType: string | null | undefined) {
  if (!mimeType) {
    return "image/png";
  }

  return mimeType.toLowerCase();
}

function inferImageExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/bmp":
      return "bmp";
    default:
      return "png";
  }
}

export function inferImageAltText(source: string) {
  if (!source || source.startsWith("data:")) {
    return "image";
  }

  const normalizedSource = source.split("?")[0]?.split("#")[0] ?? source;
  const fileName = normalizedSource.split("/").pop() ?? normalizedSource;
  const altText = fileName.replace(/\.[^.]+$/, "").trim();

  return altText.length > 0 ? altText : "image";
}

export function buildImageMarkdown(source: string, altText = inferImageAltText(source)) {
  return `![${altText}](${source})`;
}

export function buildPastedImageMarkdown(dataUrl: string, mimeType?: string | null) {
  const normalizedMimeType = normalizeImageMimeType(mimeType);
  const extension = inferImageExtension(normalizedMimeType);
  return buildImageMarkdown(dataUrl, `pasted-image.${extension}`);
}

export function insertTextAtRange(content: string, insertText: string, from: number, to: number) {
  return `${content.slice(0, from)}${insertText}${content.slice(to)}`;
}
