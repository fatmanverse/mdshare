import fs from "node:fs/promises";
import path from "node:path";

const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
const EXTERNAL_SOURCE_PATTERN = /^(https?:|data:|blob:|file:|mailto:)/i;

export function isLocalMarkdownAssetSource(source: string) {
  return Boolean(source) && !EXTERNAL_SOURCE_PATTERN.test(source);
}

export function resolveMarkdownAssetPath(source: string, markdownFilePath: string) {
  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(source) || source.startsWith("/")) {
    return source;
  }

  return path.resolve(path.dirname(markdownFilePath), source);
}

async function defaultPathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function findMissingLocalAssetSources(
  markdownFilePath: string,
  sources: string[],
  pathExists: (targetPath: string) => Promise<boolean> = defaultPathExists,
) {
  const uniqueSources = Array.from(new Set(sources.filter((source) => isLocalMarkdownAssetSource(source))));
  const missingSources: string[] = [];

  for (const source of uniqueSources) {
    const resolvedPath = resolveMarkdownAssetPath(source, markdownFilePath);
    if (!(await pathExists(resolvedPath))) {
      missingSources.push(source);
    }
  }

  return missingSources;
}
