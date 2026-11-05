---
name: vis-context
description: Resolve, change, inspect, or list specs in the active Vispector project and taxonomy context.
---

Use the authenticated Vispector MCP tools. Keep the active project ID, slug, canonical path, and pending-path flag in this conversation only.

1. Supported forms: `/vis-context [project-slug/taxonomy-path]` resolves or switches context; `/vis-context list [taxonomy-path]` summarizes direct child specs; `/vis-context show [taxonomy-path]` prints the full subtree as a compact tree without spec details. List/show paths are operation-only overrides and do not change active context. If omitted, use the active context; ask if none exists.
2. Confirm project identity and access. An access error does not mean the project is absent. If the project is absent, propose its name, slug, type, and required settings; create it only after the user confirms, using `create_project` and an idempotency key.
3. A new taxonomy path is pending until a spec creates it. Do not claim folders exist or invent folder creation. Resolve ambiguity with the user.
4. For `list`, resolve the target path in the active project and require it to exist. If it resolves to a spec, return only that spec. If it resolves to a folder, call `list_specs` with that subtree and follow every `next_cursor`; because the tool includes descendants recursively, keep only specs whose taxonomy path is exactly one segment below the folder. With project root context, keep only top-level specs. Do not include deeper descendants.
5. Use `get_spec` for each selected item and report name, taxonomy path, status, and description. Include `semantic_context` as the screen-level assertion. List every region by `region_id` and description, with required status and its supported `checks`. If a spec has no regions or checks, say so. Preserve pagination and revision/workspace metadata; report read failures instead of silently omitting specs.
6. For `show`, resolve the target folder/spec and walk it with `list_taxonomy`. Fetch every page for each parent; recurse into folder nodes using their `taxonomy_path` until all descendants are included. A spec node is a leaf. If the target is a spec, show that single leaf. For a folder target, include its resolved node as the tree root, then its subtree; for project-root context, use the project as root. Render an indented tree of names/slugs, marking folders and specs; include no descriptions, regions, checks, or other spec details. Preserve the returned revision/workspace metadata and report incomplete reads.
7. An explicit context switch changes this conversation's default. A path passed to `list`, `show`, or another skill overrides it for that operation only.

Report access, not-found, and unsupported-reference errors distinctly. Never write credentials or context to global files. See the installed repository's `docs/usage.md` for examples.
