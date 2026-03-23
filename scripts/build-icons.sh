#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$ROOT_DIR/public"
BUILD_DIR="$ROOT_DIR/build"
SOURCE_PNG_1024="$PUBLIC_DIR/icon.png"
SOURCE_PNG_512="$PUBLIC_DIR/icon-512.png"
SOURCE_PNG_256="$PUBLIC_DIR/icon-256.png"
TMP_ICNS_DIR="$BUILD_DIR/mdshare.icnsset"

log() {
  printf '[build-icons] %s\n' "$*"
}

error() {
  printf '[build-icons] ERROR: %s\n' "$*" >&2
}

ensure_file() {
  local file_path="$1"
  if [ ! -f "$file_path" ]; then
    error "Missing required file: $file_path"
    exit 1
  fi
}

ensure_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    error "Missing required command: $command_name"
    exit 1
  fi
}

resize_png() {
  local size="$1"
  local output_path="$2"

  ensure_command sips
  sips -z "$size" "$size" "$SOURCE_PNG_1024" --out "$output_path" >/dev/null
}

write_windows_ico() {
  local source_png="$1"
  local output_ico="$2"

  ICON_SOURCE_PNG="$source_png" ICON_OUTPUT_ICO="$output_ico" node --input-type=commonjs <<'NODE'
const fs = require('node:fs');

const sourcePngPath = process.env.ICON_SOURCE_PNG;
const outputIcoPath = process.env.ICON_OUTPUT_ICO;

if (!sourcePngPath || !outputIcoPath) {
  throw new Error('Missing icon source or output path');
}

const png = fs.readFileSync(sourcePngPath);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const directoryEntry = Buffer.alloc(16);
directoryEntry[0] = 0;
directoryEntry[1] = 0;
directoryEntry[2] = 0;
directoryEntry[3] = 0;
directoryEntry.writeUInt16LE(1, 4);
directoryEntry.writeUInt16LE(32, 6);
directoryEntry.writeUInt32LE(png.length, 8);
directoryEntry.writeUInt32LE(header.length + directoryEntry.length, 12);

fs.writeFileSync(outputIcoPath, Buffer.concat([header, directoryEntry, png]));
NODE
}

write_macos_icns() {
  rm -rf "$TMP_ICNS_DIR"
  mkdir -p "$TMP_ICNS_DIR"

  cp "$SOURCE_PNG_1024" "$TMP_ICNS_DIR/icon_1024.png"
  cp "$SOURCE_PNG_512" "$TMP_ICNS_DIR/icon_512.png"
  cp "$SOURCE_PNG_256" "$TMP_ICNS_DIR/icon_256.png"
  resize_png 128 "$TMP_ICNS_DIR/icon_128.png"
  resize_png 64 "$TMP_ICNS_DIR/icon_64.png"
  resize_png 32 "$TMP_ICNS_DIR/icon_32.png"
  resize_png 16 "$TMP_ICNS_DIR/icon_16.png"

  ICNS_INPUT_DIR="$TMP_ICNS_DIR" ICNS_OUTPUT_PATH="$BUILD_DIR/icon.icns" node --input-type=commonjs <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const inputDir = process.env.ICNS_INPUT_DIR;
const outputPath = process.env.ICNS_OUTPUT_PATH;

if (!inputDir || !outputPath) {
  throw new Error('Missing ICNS input/output path');
}

const entries = [
  ['icp4', 'icon_16.png'],
  ['icp5', 'icon_32.png'],
  ['icp6', 'icon_64.png'],
  ['ic07', 'icon_128.png'],
  ['ic08', 'icon_256.png'],
  ['ic09', 'icon_512.png'],
  ['ic10', 'icon_1024.png'],
].map(([type, fileName]) => {
  const png = fs.readFileSync(path.join(inputDir, fileName));
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32BE(png.length + 8, 4);
  return Buffer.concat([header, png]);
});

const totalLength = entries.reduce((sum, entry) => sum + entry.length, 8);
const fileHeader = Buffer.alloc(8);
fileHeader.write('icns', 0, 4, 'ascii');
fileHeader.writeUInt32BE(totalLength, 4);

fs.writeFileSync(outputPath, Buffer.concat([fileHeader, ...entries]));
NODE

  rm -rf "$TMP_ICNS_DIR"
}

ensure_command node
ensure_file "$SOURCE_PNG_1024"
ensure_file "$SOURCE_PNG_512"
ensure_file "$SOURCE_PNG_256"

mkdir -p "$BUILD_DIR"
find "$BUILD_DIR" -maxdepth 1 -type d \( -name '*.iconset' -o -name '*.icnsset' \) -exec rm -rf {} + 2>/dev/null || true

log 'writing png asset'
cp "$SOURCE_PNG_512" "$BUILD_DIR/icon.png"

log 'writing ico asset'
write_windows_ico "$SOURCE_PNG_256" "$BUILD_DIR/icon.ico"

log 'writing macOS icns asset'
write_macos_icns

log 'done'
