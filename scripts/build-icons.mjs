#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const publicDir = path.join(rootDir, 'public');
const buildDir = path.join(rootDir, 'build');
const sourcePng1024 = path.join(publicDir, 'icon.png');
const sourcePng512 = path.join(publicDir, 'icon-512.png');
const sourcePng256 = path.join(publicDir, 'icon-256.png');
const tmpIcnsDir = path.join(buildDir, 'mdshare.icnsset');

function log(message) {
  process.stdout.write(`[build-icons] ${message}\n`);
}

function fail(message) {
  process.stderr.write(`[build-icons] ERROR: ${message}\n`);
  process.exit(1);
}

function ensureFile(filePath) {
  if (!existsSync(filePath)) {
    fail(`Missing required file: ${filePath}`);
  }
}

function resizePng(size, outputPath) {
  const result = spawnSync('sips', ['-z', String(size), String(size), sourcePng1024, '--out', outputPath], {
    stdio: 'ignore',
  });

  if (result.status !== 0) {
    throw new Error(`sips failed to generate ${path.basename(outputPath)}`);
  }
}

function writeWindowsIco(sourcePngPath, outputIcoPath) {
  const png = readFileSync(sourcePngPath);
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

  writeFileSync(outputIcoPath, Buffer.concat([header, directoryEntry, png]));
}

function writeMacosIcns() {
  if (process.platform !== 'darwin') {
    log('Skipping macOS icns asset on non-macOS host');
    return;
  }

  const sipsCheck = spawnSync('sips', ['--help'], { stdio: 'ignore' });
  if (sipsCheck.status !== 0) {
    log('Skipping macOS icns asset because sips is unavailable');
    return;
  }

  rmSync(tmpIcnsDir, { recursive: true, force: true });
  mkdirSync(tmpIcnsDir, { recursive: true });

  try {
    copyFileSync(sourcePng1024, path.join(tmpIcnsDir, 'icon_1024.png'));
    copyFileSync(sourcePng512, path.join(tmpIcnsDir, 'icon_512.png'));
    copyFileSync(sourcePng256, path.join(tmpIcnsDir, 'icon_256.png'));
    resizePng(128, path.join(tmpIcnsDir, 'icon_128.png'));
    resizePng(64, path.join(tmpIcnsDir, 'icon_64.png'));
    resizePng(32, path.join(tmpIcnsDir, 'icon_32.png'));
    resizePng(16, path.join(tmpIcnsDir, 'icon_16.png'));

    const entries = [
      ['icp4', 'icon_16.png'],
      ['icp5', 'icon_32.png'],
      ['icp6', 'icon_64.png'],
      ['ic07', 'icon_128.png'],
      ['ic08', 'icon_256.png'],
      ['ic09', 'icon_512.png'],
      ['ic10', 'icon_1024.png'],
    ].map(([type, fileName]) => {
      const png = readFileSync(path.join(tmpIcnsDir, fileName));
      const header = Buffer.alloc(8);
      header.write(type, 0, 4, 'ascii');
      header.writeUInt32BE(png.length + 8, 4);
      return Buffer.concat([header, png]);
    });

    const totalLength = entries.reduce((sum, entry) => sum + entry.length, 8);
    const fileHeader = Buffer.alloc(8);
    fileHeader.write('icns', 0, 4, 'ascii');
    fileHeader.writeUInt32BE(totalLength, 4);

    writeFileSync(path.join(buildDir, 'icon.icns'), Buffer.concat([fileHeader, ...entries]));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Skipping macOS icns asset because generation failed: ${message}`);
  } finally {
    rmSync(tmpIcnsDir, { recursive: true, force: true });
  }
}

ensureFile(sourcePng1024);
ensureFile(sourcePng512);
ensureFile(sourcePng256);

mkdirSync(buildDir, { recursive: true });
rmSync(tmpIcnsDir, { recursive: true, force: true });

log('writing png asset');
copyFileSync(sourcePng512, path.join(buildDir, 'icon.png'));

log('writing ico asset');
writeWindowsIco(sourcePng256, path.join(buildDir, 'icon.ico'));

log('writing macOS icns asset');
writeMacosIcns();

log('done');
