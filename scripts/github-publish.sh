#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMMAND="${1:-help}"
REPO_NAME="${2:-}"
VISIBILITY="${3:-public}"
VERSION="${2:-}"
DEFAULT_MESSAGE="chore: initial project import"

log() {
  printf '[github-publish] %s\n' "$*"
}

error() {
  printf '[github-publish] ERROR: %s\n' "$*" >&2
}

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/github-publish.sh init owner/repo [public|private]
  ./scripts/github-publish.sh release v0.1.0
  ./scripts/github-publish.sh help

Commands:
  init       Initialize local git repo if needed, create the GitHub repo via gh, and push main
  release    Create and push a version tag like v0.1.0, which triggers the GitHub Release workflow

Requirements:
  - gh CLI installed and authenticated (`gh auth login`)
  - git configured with username/email
USAGE
}

ensure_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    error "Missing command: $cmd"
    exit 1
  fi
}

ensure_git_repo() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git init -b main
  fi
}

ensure_initial_commit() {
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    return
  fi

  git add .
  git commit -m "$DEFAULT_MESSAGE"
}

init_repo() {
  if [ -z "$REPO_NAME" ]; then
    error "Missing repo name, expected owner/repo"
    usage
    exit 1
  fi

  ensure_cmd git
  ensure_cmd gh
  ensure_git_repo
  ensure_initial_commit

  local visibility_flag="--public"
  if [ "$VISIBILITY" = "private" ]; then
    visibility_flag="--private"
  fi

  if git remote get-url origin >/dev/null 2>&1; then
    log "Git remote origin already exists, skip gh repo create"
  else
    gh repo create "$REPO_NAME" "$visibility_flag" --source=. --remote=origin --push
  fi

  git push -u origin main
}

create_release_tag() {
  if [ -z "$VERSION" ]; then
    error "Missing version tag, expected something like v0.1.0"
    usage
    exit 1
  fi

  ensure_cmd git
  git tag -a "$VERSION" -m "$VERSION"
  git push origin "$VERSION"
}

case "$COMMAND" in
  init)
    init_repo
    ;;
  release)
    create_release_tag
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    error "Unsupported command: $COMMAND"
    usage
    exit 1
    ;;
esac
