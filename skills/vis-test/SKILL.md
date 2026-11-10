---
name: vis-test
description: Inspect a local screenshot and optionally evaluate a natural-language predicate against returned evidence.
---

Invocation: run the `vis-test` skill (slash command `/vis-test` in clients that support it). Arguments: `<image-path> [taxonomy-path] [predicate]`. Quote natural-language predicates. If the path is omitted, use active conversation context; an explicit path is operation-only. Ask when context is missing or ambiguous.

Call local MCP `vis_upload_image` with `mode: "inspect"`, the image path, and an optional taxonomy path override. It reads the image locally, submits `run_inspect` once to authenticated remote MCP with an idempotency key, and polls `get_inspection` by the accepted ID. Never read or pass image bytes/base64 through model context, pass a predicate to MCP, or resubmit while polling. Keep the inspection ID, pinned revision, returned workspace version, and original result as the source record for the inspection.

For Visual QA map `SUPPORTED` to inspection PASS, `CONTRADICTED` to FAIL, and `INSUFFICIENT_EVIDENCE` to INCONCLUSIVE. Failures, timeouts, unknown project types, and context errors are execution errors or explicit unsupported mappings, never visual FAIL. Include the pinned revision and workspace version when reporting results.

With a predicate, evaluate only returned observed evidence, including passing and failing regions/attentions, scene observations, boxes, and explicit evidence. Preserve source identity and status. Exclude authored expectations, check descriptions, inferred absences, and synthetic missing-region entries as proof. Use INCONCLUSIVE for incomplete coverage or unreliable reasoning. Return the original inspection result plus `inspection_status`, predicate text, `predicate_status`, `test_status`, evidence references, and reason. Predicate MATCH => PASS; CONTRADICTED => FAIL / `PREDICATE_NOT_SATISFIED`; INSUFFICIENT => INCONCLUSIVE / `PREDICATE_NOT_ESTABLISHED`. Do not rewrite inspection results. A predicate PASS never changes the `vis-impl` skill's source of requirements. See `docs/usage.md` and `docs/limitations.md`.
