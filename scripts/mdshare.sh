#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMMAND="${1:-dev}"
TARGET="${2:-current}"
FORCE_INSTALL="${MDSHARE_FORCE_INSTALL:-0}"

log() {
  printf '[mdshare] %s\n' "$*"
}

error() {
  printf '[mdshare] ERROR: %s\n' "$*" >&2
}

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/mdshare.sh dev
  ./scripts/mdshare.sh build
  ./scripts/mdshare.sh package current
  ./scripts/mdshare.sh package mac
  ./scripts/mdshare.sh package win
  ./scripts/mdshare.sh package linux
  ./scripts/mdshare.sh package all
  ./scripts/mdshare.sh help

Commands:
  dev              Install deps if needed, then start the desktop app in dev mode
  build            Build renderer + electron bundles
  package current  Build installer/artifacts for the current host platform
  package mac      Build macOS artifacts (dmg, zip)
  package win      Build Windows artifacts (nsis, portable)
  package linux    Build Linux artifacts (AppImage, deb, tar.gz)
  package all      Try to build macOS / Windows / Linux artifacts in sequence

Notes:
  - Cross-platform packaging depends on the host OS and local toolchains.
  - macOS artifacts must be built on macOS.
  - Windows artifacts on macOS/Linux may require Wine/Mono.
  - Linux artifacts may require additional native packaging tools.
  - Artifacts are written to ./release
USAGE
}

ensure_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    error "Missing required command: $cmd"
    exit 1
  fi
}

npm_install_command() {
  if [ -f package-lock.json ]; then
    printf 'npm ci'
  else
    printf 'npm install'
  fi
}

ensure_dependencies() {
  if [ "$FORCE_INSTALL" = "1" ] || [ ! -d node_modules ]; then
    local install_cmd
    install_cmd="$(npm_install_command)"
    log "Installing dependencies with: ${install_cmd}"
    eval "$install_cmd"
  else
    log "Dependencies already present, skip install"
  fi
}

ensure_icon_assets() {
  if [ -f "./scripts/build-icons.mjs" ]; then
    log "Refreshing icon assets"
    node ./scripts/build-icons.mjs
  fi
}

run_npm_script() {
  local script_name="$1"
  log "Running npm script: ${script_name}"
  npm run "$script_name"
}

run_package_target() {
  local target_name="$1"

  case "$target_name" in
    current)
      run_npm_script "dist:current"
      ;;
    mac)
      run_npm_script "dist:mac"
      ;;
    win)
      run_npm_script "dist:win"
      ;;
    linux)
      run_npm_script "dist:linux"
      ;;
    *)
      error "Unsupported package target: ${target_name}"
      usage
      exit 1
      ;;
  esac
}

run_package_all() {
  local targets=(mac win linux)
  local failed_targets=()

  log "Trying multi-platform packaging. Host/toolchain limitations may cause some targets to fail."

  for target_name in "${targets[@]}"; do
    log "Packaging target: ${target_name}"
    if run_package_target "$target_name"; then
      log "Packaging succeeded: ${target_name}"
    else
      error "Packaging failed: ${target_name}"
      failed_targets+=("$target_name")
    fi
  done

  if [ "${#failed_targets[@]}" -gt 0 ]; then
    error "Some targets failed: ${failed_targets[*]}"
    exit 1
  fi

  log "All package targets succeeded"
}

ensure_cmd node
ensure_cmd npm

case "$COMMAND" in
  dev)
    ensure_dependencies
    run_npm_script "dev"
    ;;
  build)
    ensure_dependencies
    ensure_icon_assets
    run_npm_script "build"
    ;;
  package)
    ensure_dependencies
    ensure_icon_assets
    if [ "$TARGET" = "all" ]; then
      run_package_all
    else
      run_package_target "$TARGET"
    fi
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    error "Unsupported command: ${COMMAND}"
    usage
    exit 1
    ;;
esac
