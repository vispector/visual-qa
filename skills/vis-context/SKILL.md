---
name: vis-context
description: For a requested context switch, invoke the Vispector MCP context tool directly. In OpenCode its exposed name is vispector-local_vis_set_context. Do not turn an MCP operation into a generic tool lookup or report a missing-tool error as a missing project. Also read, list, or show the active context.
---

## Set context

This skill is instructions, not an MCP tool. In OpenCode, call `vispector-local_vis_set_context` directly; it is tool `vis_set_context` on the `vispector-local` MCP server. Do not call `vispector_local_vis_set_context` or a generic tool-finder operation. In clients that expose a different registered alias, call that client's MCP tool directly.

Whenever the user asks to set, switch, or select the active Vispector context and gives a project path (including `/vis-context <project-slug>[/taxonomy-prefix]`), invoke the context MCP tool immediately, once. Pass the supplied project path as its `context` argument:

```json
{"context":"<project-slug>[/taxonomy-prefix]"}
```

Call the registered context MCP tool once with only the supplied `context`. If the tool is unavailable in the client, report an MCP tool availability issue; do not invoke a guessed alias or claim the project is missing. Existing projects are selected immediately. Only if the MCP tool actually returns `PROJECT_NOT_FOUND`, ask the user whether to create a Visual QA project named with the first path segment (the project slug) and set this context. Do not create it from the path alone. If the user confirms, call the same MCP tool again with the same context and `create_if_missing: true`; then report the result. If the user declines, stop without changing context. Do not pass a `path` argument or include `/vis-context` in the context value. Do not announce that you will load the tool; call it. Do not ask for project name, type, settings, or idempotency key; creation uses the slug as the project name and Visual QA as its type. Do not call `list_projects`, `list_specs`, `vis_get_context`, or another tool first. Report the tool result.

If `vis_set_context` fails, report one concise sentence with the error code and reason once, then stop; do not repeat the tool message or add a separate `Error:` block.

When the user invokes `/vis-context` with no path, call `vis_get_context` once and report the result. If it returns `CONTEXT_NOT_SET`, ask only for the project slug/path to select.

The context lasts for the local MCP process. Project-root and missing taxonomy prefixes are valid logical scopes. Context selection creates no taxonomy nodes; listing specs in an empty scope returns no items.

## List specs

For `/vis-context list [path]`, use the active project and optional path override. Call `list_specs`, follow every page, and show only direct child specs (or the exact spec if the path is a spec). Read each result with `get_spec`. Report name, path, status, description, `semantic_context`, every region and its supported checks, and revision/workspace metadata. Report read failures.

## Show taxonomy

For `/vis-context show [path]`, use the active project and optional path override. Recursively call `list_taxonomy`, following every page. Render only names/slugs and folder/spec type as an indented tree. A spec is a leaf. Include the project as root when showing project-root context. Report incomplete reads.

An explicit path for `list` or `show` applies only to that operation; it does not change active context. Never save credentials or context to files.
