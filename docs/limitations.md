# Limitations and error handling

- Project/spec discovery depends on organization-scoped MCP permissions. Access denial is not evidence that a project is missing.
- `list_specs` and `get_spec` can read immutable published/explicit revisions without mutable overlays, and workspace views return `workspace_version`. For an inspection, compare both returned revision and workspace version against paginated current spec reads and every complete spec read; report the relationship as unproven if values differ.
- Visual QA returns `SUPPORTED`, `CONTRADICTED`, or `INSUFFICIENT_EVIDENCE`. Other project types have distinct result contracts; do not invent a PASS/FAIL mapping.
- `/vis-test` currently maps only the Visual QA result contract. It must report other project types as unsupported unless their outcome mapping is explicitly established.
- A model omission or synthetic `missing` region is not direct evidence of absence. Predicate evaluation must respect explicit observations and coverage.
- Saved natural-language specification-level assertions, including cross-region alignment, are not supported by the current validator and inspection pipeline. Do not accept or store them as if effective.
- `get_workbench_link` supports authorized project and specification editor routes when `WORKBENCH_BASE_URL` is configured. Taxonomy-folder selection has no direct Workbench route and returns `unsupported_route`. Deployed base URL wiring still requires deployment acceptance.
- Installation, 8B-class prompt evaluation, public release, production-like endpoint acceptance, and a real authorized local screenshot workflow have not been verified here.
- The runtime supports authenticated Streamable HTTP only. It requires a separately configured key, endpoint, and network access. It does not provide universal MCP-client support or a second upload API.

For failures, preserve the MCP error code/message where available and distinguish authorization, context, image validation, admission/billing, job failure, timeout, and insufficient visual evidence. Never turn an execution failure into a visual FAIL or predicate match.
