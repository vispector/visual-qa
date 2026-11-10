# Behavior and error handling

- Project/spec discovery depends on organization-scoped MCP permissions. Access denial is not evidence that a project is missing.
- Each inspection runs against a pinned revision and workspace snapshot. Keep the returned revision and workspace version with the result when recording or comparing outcomes.
- Visual QA returns `SUPPORTED`, `CONTRADICTED`, or `INSUFFICIENT_EVIDENCE`. Other project types have distinct result contracts; do not invent a PASS/FAIL mapping.
- `/vis-test` currently maps only the Visual QA result contract. It must report other project types as unsupported unless their outcome mapping is explicitly established.
- A model omission or synthetic `missing` region is not direct evidence of absence. Predicate evaluation must respect explicit observations and coverage.
- `get_workbench_link` provides authorized project and specification editor routes when `WORKBENCH_BASE_URL` is configured. Taxonomy folders are browsed in the Workbench taxonomy view.
- The local stdio server reads image bytes from the local filesystem and submits base64 directly to remote `run_inspect` or `decompose_ui` with bearer API-key authentication. No reusable image reference or second upload API is involved. Local MCP credentials and the independently configured remote MCP client may use the same API key.
- Context state lasts for the local server process. Conversations connected to that process may share it; persistence and isolation across processes are not promised.
- The project listing filters projects the API key cannot access. A filtered result does not prove that a project is absent.
- Local tool errors use a JSON text envelope with a stable `code` and sanitized `message`: `CONTEXT_NOT_SET`, `INVALID_CONTEXT`, `PROJECT_NOT_FOUND`, `PROJECT_ACCESS_DENIED`, `AUTH_NOT_CONFIGURED`, `INVALID_SPEC_CONFIG`, `IMAGE_NOT_FOUND`, `UNSUPPORTED_IMAGE`, `IMAGE_TOO_LARGE`, `UPLOAD_FAILED`, `NO_SPECS`, and `INSPECTION_TIMEOUT`. Project access is intentionally non-disclosing in some remote MCP responses, so an unavailable project may be indistinguishable from a missing one.
- Image-derived save workflow errors are `SAVE_NOT_CONFIRMED`, `SAVE_CONFLICT`, and `STALE_PROPOSAL`. These are skill workflow outcomes: no write is sent before explicit proposal confirmation, conditional/versioned update, and a fresh read.

For failures, preserve the MCP error code/message where available and distinguish authorization, context, image validation, admission/billing, job failure, timeout, and insufficient visual evidence. Never turn an execution failure into a visual FAIL or predicate match.
