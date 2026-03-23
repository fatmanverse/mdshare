const IMAGE_TAG_PATTERN = /<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
const EXTERNAL_SOURCE_PATTERN = /^(https?:|data:|blob:|file:)/i;

function normalizeFilePath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function toFileUrl(filePath: string) {
  const normalizedPath = normalizeFilePath(filePath);
  const pathname = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  return `file://${encodeURI(pathname)}`;
}

function toFileDirectoryUrl(filePath: string) {
  const normalizedPath = normalizeFilePath(filePath);
  const directoryPath = normalizedPath.replace(/\/[^/]*$/, "/");
  const pathname = directoryPath.startsWith("/") ? directoryPath : `/${directoryPath}`;
  return `file://${encodeURI(pathname)}`;
}

export function resolveImageSourceForPreview(source: string, markdownFilePath: string | null) {
  if (!source || EXTERNAL_SOURCE_PATTERN.test(source)) {
    return source;
  }

  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(source) || source.startsWith("/")) {
    return toFileUrl(source);
  }

  if (!markdownFilePath) {
    return source;
  }

  try {
    return new URL(source, toFileDirectoryUrl(markdownFilePath)).toString();
  } catch {
    return source;
  }
}

export function replaceImageSources(html: string, transform: (source: string) => string) {
  return html.replace(IMAGE_TAG_PATTERN, (_match, before, quote, source, after) => {
    const nextSource = transform(source);
    return `<img${before}src=${quote}${nextSource}${quote}${after}>`;
  });
}

export function preparePreviewHtml(html: string, markdownFilePath: string | null) {
  return replaceImageSources(html, (source) => resolveImageSourceForPreview(source, markdownFilePath));
}
