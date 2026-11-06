---
name: vis-spec
description: Show or make user-directed edits to a Vispector Visual QA specification.
---

Invocation: run the `vis-spec` skill (slash command `/vis-spec` in clients that support it). Arguments: `<spec-slug> <show|create|add|update|remove|assert> [region-id] [description] [--taxonomy-path <path>]`. For `assert`, the description is the full screen-level requirement and does not take a region ID. The spec slug is mandatory and is a terminal taxonomy slug, never a backend ID or region ID. Parse `add:`, `update:`, and `remove:` only when their target is unambiguous.

Read the active project and taxonomy scope from local MCP `vis_get_context`; an explicit taxonomy path overrides it for this operation only. Use authenticated remote Vispector MCP for specification reads and writes. The complete target path is `<parent>/<spec-slug>`. A pending parent becomes established only after successful `create_spec`. Read the full current spec and workspace version first. Use `create_spec` or `update_spec`; preserve unrelated items and stable IDs. On a conflict, reread and review. Validate slug/depth constraints and distinguish region IDs from spec slugs.

Direct user-authored edits are authorized by the command. Decomposition-derived content requires showing actual findings and confirmation before saving. Never fabricate coordinates or findings, silently edit shared targets, or bypass missing screenshots. Explain unsupported references and link support limits.

`assert` sets the screen-level requirement in `semantic_context`, which Visual QA evaluates as part of the specification result. Keep region-specific requirements in the relevant region checks. See `docs/usage.md`.
