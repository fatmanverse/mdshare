import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_TAG_PATTERN = /<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
const EXTERNAL_SOURCE_PATTERN = /^(https?:|data:|blob:)/i;

function detectMimeType(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function resolveLocalImagePath(source: string, markdownFilePath: string | null) {
  if (!source || EXTERNAL_SOURCE_PATTERN.test(source)) {
    return null;
  }

  if (source.startsWith("file://")) {
    return fileURLToPath(source);
  }

  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(source) || source.startsWith("/")) {
    return path.resolve(source);
  }

  if (!markdownFilePath) {
    return null;
  }

  return path.resolve(path.dirname(markdownFilePath), source);
}

export async function inlineLocalImagesInHtml(html: string, markdownFilePath: string | null) {
  const matches = [...html.matchAll(IMAGE_TAG_PATTERN)];
  if (matches.length === 0) {
    return html;
  }

  const cache = new Map<string, string>();
  let output = "";
  let lastIndex = 0;

  for (const match of matches) {
    const [fullMatch, before, quote, source, after] = match;
    const matchIndex = match.index ?? 0;

    output += html.slice(lastIndex, matchIndex);

    let nextSource = cache.get(source);
    if (!nextSource) {
      const resolvedPath = resolveLocalImagePath(source, markdownFilePath);
      if (resolvedPath) {
        try {
          const buffer = await fs.readFile(resolvedPath);
          nextSource = `data:${detectMimeType(resolvedPath)};base64,${buffer.toString("base64")}`;
        } catch {
          nextSource = source;
        }
      } else {
        nextSource = source;
      }

      cache.set(source, nextSource);
    }

    output += `<img${before}src=${quote}${nextSource}${quote}${after}>`;
    lastIndex = matchIndex + fullMatch.length;
  }

  output += html.slice(lastIndex);
  return output;
}
