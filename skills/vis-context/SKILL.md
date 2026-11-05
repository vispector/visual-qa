---
name: vis-context
description: Resolve or change the active Vispector project and taxonomy context.
---

Use the authenticated Vispector MCP tools. Keep the active project ID, slug, canonical path, and pending-path flag in this conversation only.

1. With an explicit project/path, resolve it using `resolve_taxonomy_context`; with no path, ask for one unless this conversation already has an active context.
2. Confirm project identity and access. An access error does not mean the project is absent. If the project is absent, propose its name, slug, type, and required settings; create it only after the user confirms, using `create_project` and an idempotency key.
3. A new taxonomy path is pending until a spec creates it. Do not claim folders exist or invent folder creation. Resolve ambiguity with the user.
4. Retrieve all pages from `list_specs` under an existing context and use `get_spec` for complete documents. Summarize regions and attentions; disclose unavailable references.
5. An explicit context switch changes this conversation's default. A path passed to another skill overrides context for that operation only.

Report access, not-found, and unsupported-reference errors distinctly. Never write credentials or context to global files. See the installed repository's `docs/usage.md` for examples.
