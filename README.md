# Vispector Visual QA skills

This repository distributes five agent skills for the authenticated Vispector MCP server: context discovery, candidate area discovery, Visual QA specification management, screenshot testing, and implementation verification. The agent uses its own visual and semantic reasoning; Vispector remains responsible for authorization, revision selection, inspection execution, and billing.

## Workflow

Configure an authenticated Vispector MCP endpoint, install the skills, establish a project context, then use `/vis-list-areas`, `/vis-spec`, `/vis-test`, and `/vis-impl` as needed. Discovery only proposes candidates. Saving a specification requires the user's direction. Predicate evaluation happens after inspection against returned observations; it does not trigger a second inspection.

## Requirements and installation

Supported client: Codex skills on macOS/Linux, Node.js 18 or newer, and a Vispector API key with MCP access. Set `VISPECTOR_MCP_URL` to the Streamable HTTP endpoint (for example `https://<host>/mcp/`) and `VISPECTOR_MCP_TOKEN` to the API key in the environment used by Codex. Never put the token in this repository or a skill prompt.

Inspect the installer first:

```sh
curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/main/install.sh
```

Install the current `main` checkout:

```sh
curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/main/install.sh | bash
```

Install a published pinned ref with `curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/<tag>/install.sh | VISPECTOR_SKILLS_REF=<tag> bash` after a release tag exists. Re-run the installer to update. To uninstall, remove the five `vis-*` directories and `vispector-visual-qa-runtime` from `$CODEX_HOME/skills` (default `~/.codex/skills`). The installer replaces only files it owns in those paths.

Read [setup and authentication](docs/setup.md), [skill usage](docs/usage.md), [limitations](docs/limitations.md), and [developer notes](docs/development.md) before production use. Slash invocation is Codex-specific; other clients may expose the same `SKILL.md` content under different names or invocation syntax and are not currently supported by this installer.

## Current support limits

The authenticated MCP endpoint supports async `decompose_ui`, `run_inspect`, and `get_inspection`. Context and spec CRUD use the organization-scoped management tools. Some Phase 5 capabilities remain unavailable: natural-language saved specification assertions, explicit historical revision reads on spec tools, and taxonomy-folder Workbench deep links. Project and specification editor links are supported when the Workbench base URL is configured. The skills must report limits rather than claim success.
