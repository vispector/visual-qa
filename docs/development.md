# Developer notes

## Files and behavior

- `skills/*/SKILL.md` use the portable Agent Skills format supported by Codex, Claude Code, and OpenCode. Keep prompts short and place extended guidance here.
- `runtime/local-server.mjs` implements local stdio MCP, process-local context, image path reading, base64 transfer to remote MCP, and polling using Node built-ins.
- `package.json` exposes `vispector-local-mcp` for `npx` GitHub installs without runtime dependencies.
- `runtime/mcp.mjs` implements authenticated Streamable HTTP initialization and remote tool calls. `runtime/upload-image.mjs` remains a compatibility CLI during migration.
- `install.sh` installs exactly five skills and the shared runtime under `VISPECTOR_SKILLS_DIR`, defaulting to `$CODEX_HOME/skills` or `~/.codex/skills`.

The local server accepts PNG, JPEG, and WebP signatures, then relies on Vispector's server-side decoder, MIME match, upload, pixel, and processing checks for full image validation. It stores no image in a temporary file and never logs image bytes, base64, bearer tokens, or backend response bodies. Relative paths resolve against `VISPECTOR_WORKING_DIR` or the server working directory.

## Prompt size

Measured as UTF-8 bytes of the installed `SKILL.md` prompt file (front matter included): measure with `wc -c skills/*/SKILL.md`. This is a prompt-size record method, not proof of small-model compatibility. No supported 8B-class model evaluation has been performed; record exact model and context settings when available.

Run local checks with `node --test runtime/test.mjs runtime/local-server.test.mjs` and `bash -n install.sh`. Synthetic checks do not validate public distribution or a live service.

The installer supports `VISPECTOR_SKILLS_SOURCE=<local-checkout>` for offline packaging checks. Point `VISPECTOR_SKILLS_DIR` at a fresh temporary directory, pre-create an unrelated file, run the installer, and confirm the skills/runtime were copied while that file remains. Public installation must still be checked against the published URL and ref.

## MCP contract

The remote server is stateless Streamable HTTP and requires bearer API-key authentication on each request. The local stdio server calls remote `initialize`, `notifications/initialized`, and `tools/call`; it invokes `run_inspect` or `decompose_ui` once with a base64 image payload and idempotency key, then polls `get_inspection`. It reuses the existing contract without an upload endpoint or image reference. Inspect `../vispector/docs/mcp.md` for service-side schemas and admission behavior. Never send natural-language predicates as inspection parameters.
