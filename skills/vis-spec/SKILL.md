---
name: vis-spec
description: Show or make user-directed edits to a Vispector Visual QA specification.
---

Invocation: run the `vis-spec` skill (slash command `/vis-spec` in clients that support it). Arguments: `<spec-slug> <show|create|add|update|remove|assert> [region-id] [description] [--taxonomy-path <path>]`. The spec slug is mandatory and is a terminal taxonomy slug, never a backend ID or region ID. Parse `add:`, `update:`, and `remove:` only when their target is unambiguous.

Resolve active conversation context; an explicit taxonomy path overrides it for this operation only. The complete target path is `<parent>/<spec-slug>`. A pending parent becomes established only after successful `create_spec`. Read the full current spec and workspace version first. Use `create_spec` or `update_spec`; preserve unrelated items and stable IDs. On a conflict, reread and review. Validate slug/depth constraints and distinguish region IDs from spec slugs.

Direct user-authored edits are authorized by the command. Decomposition-derived content requires showing actual findings and confirmation before saving. Never fabricate coordinates or findings, silently edit shared targets, or bypass missing screenshots. Explain unsupported references and link support limits.

`assert` means a saved, natural-language requirement evaluated during ordinary verification. The current backend has no supported persistence/evaluation contract for these assertions. Do not store them in `semantic_context`, identification guidance, or another field, and do not claim verification. Report this as unsupported until backend capability is available. See `docs/limitations.md`.
