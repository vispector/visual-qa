---
name: vis-impl
description: Implement or verify a UI against the saved effective Visual QA specification.
---

## Read the specification before changing code

Use the active client/model selected by the user. Do not hand implementation to another model or change the selected model. Follow this sequence in order:

1. If the request names a target context path, compare it with the active context. If it differs, call local MCP `vis_set_context` once with that exact path, then call `vis_get_context` once to verify. If it already matches, do not set it again. If no target path was supplied, call `vis_get_context` once and use the active context. Never repeat `vis_set_context` as a way to recover a failed spec read.
2. Identify the active project ID and complete taxonomy path from the context result. Read the target specification through authenticated remote Vispector MCP: paginate `list_specs` until the exact terminal spec is found, then call `get_spec` for its full saved document. A context path can identify a spec itself; distinguish that leaf from its parent folder when listing. Do not rely on a tree label, `get_context_desc`, a screenshot, remembered requirements, or a previous PASS in place of `get_spec`.
3. Before editing, confirm the returned project and full path match the requested context. Read and retain the complete `semantic_context`, every region and supported check, every attention, and the spec revision/workspace version. Use the saved effective spec as the implementation contract; do not add, remove, or reinterpret requirements to make a score pass.
4. If the exact spec is not in the first page, follow pagination. If it is still absent after the complete listing, report the exact path searched and stop. If `list_specs` or `get_spec` is unavailable or returns an error, report its code/message once and stop. Never loop on `vis_set_context`, guess alternate tool names, claim that the spec was read, or ask the user to paste it when the connected read failed.
5. Only after the full spec is read, inspect applicable repository instructions and the implementation. `get_context_desc` may supplement the spec, but cannot replace it. Make the smallest complete code change that satisfies the saved requirements while preserving the user's requested scope.

## Verify and report

Run the app and capture a screenshot using the project's supported facilities, then invoke/load the `vis-test` skill without an extra predicate using the current client's skill mechanism. If inspection fails visually, make at most one targeted correction, capture a new screenshot, and retest once. Normalize repeated failures by spec, region, and category; stop after the second test. Report the exact spec path and revision read, the inspection result, actionable failures separately from infrastructure errors and insufficient evidence, and any remaining blocker.

Never implement or preserve a defect to satisfy a negative-confirmation predicate. If the app cannot run or a screenshot cannot be captured, state that implementation remains unverified. Handle stale or ambiguous revisions explicitly. See `docs/usage.md`.
