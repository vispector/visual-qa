# Local MCP integration contract

Audited 2026-11-06 against the current Vispector backend and the existing skill runtime.

## Existing contract reused by the local server

- Remote MCP `run_inspect` accepts a base64 image and MIME type, a project ID or project-slug path, an existing taxonomy subtree/spec scope, and an idempotency key. It resolves the draft-first Workbench revision and returns the real inspection ID, revision ID, and workspace version. It preserves existing admission, billing, and result semantics.
- Remote MCP `decompose_ui` accepts a base64 image, semantic hint, optional normalized focus bounds, and an idempotency key. It uses the system UI decomposer and returns the actual inspection ID. `get_inspection` polls by ID within the authenticated organization.
- MCP project discovery and creation are API-key authenticated. `list_projects` paginates user-visible projects. `create_project` requires `projects:write`, a name, project type, optional slug, and idempotency key; the active user template supplies project settings. Errors are intentionally non-disclosing where project access is denied.
- Project and taxonomy slugs use `^[a-z0-9]+(?:[-_][a-z0-9]+)*$`. A root or missing taxonomy prefix can be used as a logical context, though root has no inspection target.
- Backend image upload defaults to 10 MiB (`MAX_IMAGE_UPLOAD_BYTES`) and also validates decoding, MIME consistency, pixel count, and processing limits. The local runtime accepts PNG, JPEG, and WebP signatures as an early check.

## Integration design

`vis_upload_image(path)` reads the regular file inside the local MCP process, encodes it in memory, and calls the existing authenticated remote `run_inspect` or `decompose_ui` tool. The API key is read from the process environment and sent only in the HTTP Authorization header. The local tool response contains inspection metadata and evidence, never bytes or base64. It polls the returned inspection ID without resubmitting. This is the prior script's bearer-authenticated base64 flow moved behind local stdio MCP; it does not require a binary upload endpoint or reusable image identifier.

The local server is packaged as the zero-dependency `vispector-local-mcp` executable and can be started with `npx --package=github:vispector/visual-qa#main vispector-local-mcp`.

`vis_set_context` accepts a project context string and optional `create_if_missing` flag. It searches paginated `list_projects`; existing projects are selected, while missing or inaccessible projects return an error without changing context unless `create_if_missing=true` is explicitly supplied. The skill must obtain user confirmation before setting that flag. A taxonomy prefix is retained without listing specs or creating nodes.

## Verification boundaries

The runtime contract tests use mock remote MCP responses and synthetic image bytes. A live authenticated call and project listing are available in the connected Codex environment; that does not verify OpenCode or Osaurus local stdio discovery, real image inference, installation from the public repository, or process sharing/restart behavior. Those remain separate acceptance checks.
