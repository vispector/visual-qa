# Skill usage

## Invoke a skill

The skill IDs are `vis-context`, `vis-image`, `vis-spec`, `vis-test`, and `vis-impl`. Use the client-native invocation:

- **Codex:** type the skill as a slash command, such as `/vis-context acme/settings`.
- **Claude Code:** type the same slash command, such as `/vis-context acme/settings`, or let Claude select it from the description.
- **OpenCode:** ask the agent to load/use the named skill, for example, “Use the `vis-context` skill to open `acme/settings`.” OpenCode loads skills with its native `skill` tool; it does not treat skill metadata as slash-command definitions.

When one skill refers to another (for example, implementation verification needs screenshot testing), ask the agent to invoke/load that skill using the current client's mechanism. Slash-command examples below describe the skill ID and are directly invocable in clients that support skill slash commands.

## Context and discovery

Use `/vis-context <project-slug>[/taxonomy-prefix]` to set process-local context, or `/vis-context` to reuse it. The skill makes one local MCP call. A missing project is created as Visual QA using the slug as its name, subject to project write access. Root and missing taxonomy prefixes are valid logical scopes; selection does not create taxonomy nodes. Listing specs in an empty prefix returns an empty list. Context is shared only by clients connected to the same local server process and is cleared when it exits.

Use `/vis-context list [taxonomy-path]` to list specs at the current context's next level. With a folder context, this returns only specs directly inside that folder; deeper descendant specs are excluded. With a spec path, it returns only that spec. Without a path, it uses the active context. The command paginates `list_specs`, then reads each selected spec with `get_spec` to show its metadata, screen-level assertion (`semantic_context`), regions, and region checks.

Use `/vis-context show [taxonomy-path]` for a compact tree of the entire context subtree, including folders and specs at every depth. It recursively paginates `list_taxonomy` and prints only node names/slugs and whether each is a folder or spec; it does not load or display spec details. A spec path shows only that spec leaf.

`/vis-image <image-path> [all|"<query>"] [as <spec-name>] [align-by x|y|x_or_y|x_and_y] [gap <pixels>] [save]` runs local `vis_upload_image` in discovery mode. The local server reads the path, sends base64 to authenticated remote `decompose_ui`, and polls the real inspection ID. `all` discovers broadly; a query guides semantic discovery without becoming an assertion. `as` requests a named-spec preview. Optional `align-by` and `gap` map to `align_by` and `align_gap` on `vis_upload_image`; they default to `x` and `5` pixels. When a proposed spec has an empty `semantic_context`, compose one from the selected regions' observed labels, descriptions, hierarchy, and relationships. Preserve a non-empty existing context unchanged; do not derive context from unselected regions or the query alone. Without `save`, nothing is written. With `save`, present the complete proposal, obtain explicit confirmation of that proposal, re-read versions before writes, preserve undetected specs/regions/assertions, and apply only the approved subset.

## Specifications

Examples:

- `/vis-spec subscription show`
- `/vis-spec subscription add billing-panel "Shows plan and renewal date"`
- `/vis-spec subscription update billing-panel "Shows current plan and renewal date"`
- `/vis-spec subscription remove billing-panel`
- `/vis-spec subscription assert "Plan and renewal date are aligned"`

`assert` sets the screen-level assertion stored as `semantic_context`; region-specific requirements belong in region checks. A spec path is built from parent path plus slug. Read before writing, use the current workspace version, and resolve conflicts by rereading.

## Test and implementation

`vis-test /path/to/screenshot.png [taxonomy-path] ["predicate"]` invokes local `vis_upload_image` in inspect mode once against the revision pinned for that job. Preserve its `revision_id` and `workspace_version` as provenance. The original Visual QA outcome remains intact; an optional predicate is evaluated against returned observed evidence after inspection. The compatibility CLI `runtime/upload-image.mjs` remains during migration, but updated skills do not invoke it. Poll timeout and interval can be set with `VISPECTOR_POLL_TIMEOUT_MS` and `VISPECTOR_POLL_INTERVAL_MS`; polling never resubmits an accepted job.

`vis-impl [region-id]` follows saved effective specifications, captures a screenshot, runs ordinary `vis-test`, and permits one targeted correction and one retest. A predicate result does not authorize changing the saved requirement.
