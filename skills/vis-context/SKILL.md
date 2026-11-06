---
name: vis-context
description: For a requested context switch, directly call the vis_set_context MCP tool on vispector_local with the project path as context. Do not confuse this skill with a tool or ask setup questions. Also read, list, or show the active context.
---

## Set context

This skill is instructions, not an MCP tool. The callable tool is `vis_set_context` on the `vispector_local` MCP server (some clients display it as `vispector-local.vis_set_context`).

Whenever the user asks to set, switch, or select the active Vispector context and gives a project path (including `/vis-context <project-slug>[/taxonomy-prefix]`), directly call that MCP tool immediately, once. Pass the supplied project path as its `context` argument:

```json
{"context":"<project-slug>[/taxonomy-prefix]"}
```

This call looks up the project and creates a missing Visual QA project when permitted. Do not call `vispector_local` as if the server itself were a tool, pass a `path` argument, or include `/vis-context` in the context value. Do not announce that you will load the tool; call it. Do not ask whether the project is new or existing. Do not ask for a name, project type, settings, or idempotency key. Do not call `list_projects`, `list_specs`, `vis_get_context`, or another tool first. Report the tool result.

If `vis_set_context` fails, report one concise sentence with the error code and reason once, then stop; do not repeat the tool message or add a separate `Error:` block.

When the user invokes `/vis-context` with no path, call `vis_get_context` once and report the result. If it returns `CONTEXT_NOT_SET`, ask only for the project slug/path to select.

The context lasts for the local MCP process. Project-root and missing taxonomy prefixes are valid logical scopes. Context selection creates no taxonomy nodes; listing specs in an empty scope returns no items.

## List specs

For `/vis-context list [path]`, use the active project and optional path override. Call `list_specs`, follow every page, and show only direct child specs (or the exact spec if the path is a spec). Read each result with `get_spec`. Report name, path, status, description, `semantic_context`, every region and its supported checks, and revision/workspace metadata. Report read failures.

## Show taxonomy

For `/vis-context show [path]`, use the active project and optional path override. Recursively call `list_taxonomy`, following every page. Render only names/slugs and folder/spec type as an indented tree. A spec is a leaf. Include the project as root when showing project-root context. Report incomplete reads.

An explicit path for `list` or `show` applies only to that operation; it does not change active context. Never save credentials or context to files.
