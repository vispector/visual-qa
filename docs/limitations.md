# Behavior and error handling

- Project/spec discovery depends on organization-scoped MCP permissions. Access denial is not evidence that a project is missing.
- Each inspection runs against a pinned revision and workspace snapshot. Keep the returned revision and workspace version with the result when recording or comparing outcomes.
- Visual QA returns `SUPPORTED`, `CONTRADICTED`, or `INSUFFICIENT_EVIDENCE`. Other project types have distinct result contracts; do not invent a PASS/FAIL mapping.
- `/vis-test` currently maps only the Visual QA result contract. It must report other project types as unsupported unless their outcome mapping is explicitly established.
- A model omission or synthetic `missing` region is not direct evidence of absence. Predicate evaluation must respect explicit observations and coverage.
- `get_workbench_link` provides authorized project and specification editor routes when `WORKBENCH_BASE_URL` is configured. Taxonomy folders are browsed in the Workbench taxonomy view.
- The runtime supports authenticated Streamable HTTP only. It requires a separately configured key, endpoint, and network access. It does not provide universal MCP-client support or a second upload API.

For failures, preserve the MCP error code/message where available and distinguish authorization, context, image validation, admission/billing, job failure, timeout, and insufficient visual evidence. Never turn an execution failure into a visual FAIL or predicate match.
