import fs from "node:fs/promises";
import path from "node:path";

export const PASTED_IMAGE_DIRECTORY = "assets";
export const PASTED_IMAGE_MAX_DIMENSION = 1600;
export const PASTED_IMAGE_FILE_PREFIX = "img";

export function buildPastedImageAssetDir(markdownFilePath: string) {
  return path.join(path.dirname(markdownFilePath), PASTED_IMAGE_DIRECTORY);
}

export function normalizeRelativePath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

export function getFittedImageSize(width: number, height: number, maxDimension = PASTED_IMAGE_MAX_DIMENSION) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxDimension) {
    return {
      width,
      height,
      resized: false,
    };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

function parsePastedImageIndex(fileName: string, prefix = PASTED_IMAGE_FILE_PREFIX) {
  const match = fileName.match(new RegExp(`^${prefix}-(\\d+)\\.png$`, "i"));
  if (!match) {
    return null;
  }

  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) ? index : null;
}

async function defaultReadDir(directoryPath: string) {
  try {
    return await fs.readdir(directoryPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function resolveNextPastedImagePath(
  assetDir: string,
  readDir: (directoryPath: string) => Promise<string[]> = defaultReadDir,
  prefix = PASTED_IMAGE_FILE_PREFIX,
) {
  const entries = await readDir(assetDir);
  const maxIndex = entries.reduce((currentMax, entry) => {
    const index = parsePastedImageIndex(entry, prefix);
    return index && index > currentMax ? index : currentMax;
  }, 0);

  const nextIndex = String(maxIndex + 1).padStart(3, "0");
  return path.join(assetDir, `${prefix}-${nextIndex}.png`);
}
