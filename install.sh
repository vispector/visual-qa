#!/usr/bin/env bash
set -euo pipefail

repo="https://github.com/vispector/visual-qa.git"
ref="${VISPECTOR_SKILLS_REF:-main}"
root="${CODEX_HOME:-$HOME/.codex}/skills"
tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

command -v git >/dev/null || { echo "install: git is required" >&2; exit 1; }
command -v node >/dev/null || { echo "install: Node.js 18+ is required" >&2; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])<18)process.exit(1)' || { echo "install: Node.js 18+ is required" >&2; exit 1; }
if [[ -n "${VISPECTOR_SKILLS_SOURCE:-}" ]]; then
  source="$(cd "$VISPECTOR_SKILLS_SOURCE" && pwd)"
else
  git clone --quiet --depth 1 --branch "$ref" "$repo" "$tmp/repo"
  source="$tmp/repo"
fi
for path in skills/vis-context/SKILL.md skills/vis-list-areas/SKILL.md skills/vis-spec/SKILL.md skills/vis-test/SKILL.md skills/vis-impl/SKILL.md runtime/upload-image.mjs runtime/mcp.mjs; do
  [[ -f "$source/$path" ]] || { echo "install: source is missing $path" >&2; exit 1; }
done
mkdir -p "$root"
for skill in vis-context vis-list-areas vis-spec vis-test vis-impl; do
  target="$root/$skill"
  mkdir -p "$target"
  install -m 0644 "$source/skills/$skill/SKILL.md" "$target/SKILL.md"
done
runtime="$root/vispector-visual-qa-runtime"
mkdir -p "$runtime"
install -m 0644 "$source/runtime/upload-image.mjs" "$runtime/upload-image.mjs"
install -m 0644 "$source/runtime/mcp.mjs" "$runtime/mcp.mjs"
printf 'Installed Vispector Visual QA skills (%s) to %s\n' "$ref" "$root"
