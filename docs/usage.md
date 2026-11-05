# Skill usage

## Context and discovery

Use `/vis-context <project-slug/taxonomy-path>` to resolve context, or `/vis-context` to reuse this conversation's active context. Existing paths must be resolved. A requested new taxonomy path is pending until a specification is created. Project creation requires a confirmed name, slug, type, and settings.

`/vis-list-areas <image-path>` runs `decompose_ui`. Add a short hint and optional normalized focus bounds. Returned findings are candidates, not saved specs. Compare with all pages from `list_specs`; obtain the user's selection and confirmation before creating anything.

## Specifications

Examples:

- `/vis-spec subscription show`
- `/vis-spec subscription add billing-panel "Shows plan and renewal date"`
- `/vis-spec subscription update billing-panel "Shows current plan and renewal date"`
- `/vis-spec subscription remove billing-panel`
- `/vis-spec subscription assert "Plan and renewal date are aligned"`

The last operation is unsupported by the current backend; it must be reported as such. A spec path is built from parent path plus slug. Read before writing, use the current workspace version, and resolve conflicts by rereading.

## Test and implementation

`/vis-test /path/to/screenshot.png [taxonomy-path] ["predicate"]` inspects once. The original Visual QA outcome remains intact; an optional predicate is evaluated by the agent against observed evidence after inspection. Treat uncertainty as non-success. The runtime also supports direct candidate discovery:

```sh
node "$CODEX_HOME/skills/vispector-visual-qa-runtime/upload-image.mjs" decompose ./screen.png "navigation and account panel" 0,0,1000,700
node "$CODEX_HOME/skills/vispector-visual-qa-runtime/upload-image.mjs" inspect ./screen.png acme settings/profile
```

On macOS/Linux where `CODEX_HOME` is unset, use `~/.codex/skills/vispector-visual-qa-runtime/upload-image.mjs`. Poll timeout and interval can be set with `VISPECTOR_POLL_TIMEOUT_MS` and `VISPECTOR_POLL_INTERVAL_MS`; the script never resubmits an accepted job.

`/vis-impl [region-id]` follows saved effective specifications, captures a screenshot, runs ordinary `/vis-test`, and permits one targeted correction and one retest. A predicate result does not authorize changing the saved requirement.
