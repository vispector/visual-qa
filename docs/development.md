# Developer notes

## Files and behavior

- `skills/*/SKILL.md` are Codex skills. Keep prompts short and place extended guidance here.
- `runtime/mcp.mjs` implements authenticated Streamable HTTP initialization, tool calls, local image reading, and polling helpers using Node built-ins.
- `runtime/upload-image.mjs` supports `inspect` and `decompose`. Inspection submits once with an idempotency key and polls by inspection ID only.
- `install.sh` installs exactly five skills and the shared runtime under `$CODEX_HOME/skills`.

The runtime accepts PNG, JPEG, and WebP signatures, then relies on Vispector's server-side decoder, MIME match, upload, pixel, and processing checks for full image validation. It stores no image in a temporary file. Error output may include service responses; review before sharing logs.

## Prompt size

Measured as UTF-8 bytes of the installed `SKILL.md` prompt file (front matter included): measure with `wc -c skills/*/SKILL.md`. This is a prompt-size record method, not proof of small-model compatibility. No supported 8B-class model evaluation has been performed; record exact model and context settings when available.

Current local UTF-8 byte counts: `vis-context` 1,320; `vis-list-areas` 981; `vis-spec` 1,580; `vis-test` 1,874; `vis-impl` 1,097. Run local checks with `node --test runtime/test.mjs` and `bash -n install.sh`. Synthetic checks do not validate public distribution or a live service.

The installer supports `VISPECTOR_SKILLS_SOURCE=<local-checkout>` for offline packaging checks. Point `CODEX_HOME` at a fresh temporary directory, pre-create an unrelated file, run the installer, and confirm the skills/runtime were copied while that file remains. Public installation must still be checked against the published URL and ref.

## MCP contract

The server is configured as stateless Streamable HTTP and requires bearer API-key authentication on each request. The runtime calls `initialize`, sends `notifications/initialized`, then uses `tools/call`; it invokes `run_inspect` or `decompose_ui` once and polls `get_inspection`. Inspect `../vispector/docs/mcp.md` for service-side schemas and admission behavior. Do not add a binary upload endpoint or send natural-language predicates as inspection parameters.
