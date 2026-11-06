---
name: vis-impl
description: Implement or verify a UI against the saved effective Visual QA specification.
---

Resolve active context with local MCP `vis_get_context` and read saved effective specs from authenticated remote Vispector MCP; with a region/spec identifier, focus it while preserving parent requirements. Read applicable repository instructions and use `get_context_desc` as guidance when useful. The saved spec, not a test predicate or prior PASS, defines intended behavior.

Run the app and capture a screenshot using the project's supported facilities, then invoke/load the `vis-test` skill without an extra predicate using the current client's skill mechanism. If the inspection fails visually, make at most one targeted correction, capture a new screenshot, and retest once. Normalize repeated failures by spec, region, and category; stop after the second test. Report actionable failures separately from infrastructure errors and insufficient evidence.

Never implement or preserve a defect to satisfy a negative-confirmation predicate. If the app cannot run or a screenshot cannot be captured, state that implementation remains unverified. Handle stale or ambiguous revisions explicitly. See `docs/usage.md`.
