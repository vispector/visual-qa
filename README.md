# Vispector Visual QA skills

This repository distributes five Agent Skills (`SKILL.md`) for the authenticated Vispector MCP server: context discovery, candidate area discovery, Visual QA specification management, screenshot testing, and implementation verification. The agent uses its own visual and semantic reasoning; Vispector remains responsible for authorization, revision selection, inspection execution, and billing. The skill instructions are client-neutral; discovery and invocation depend on the agent client.

## Workflow

Configure an authenticated Vispector MCP endpoint, install the skills, establish a project context, then use `vis-list-areas`, `vis-spec`, `vis-test`, and `vis-impl` as needed. Codex and Claude Code support direct slash invocation such as `/vis-test`; OpenCode exposes skills through its native skill tool, so ask the agent to use the named skill. Discovery only proposes candidates. Saving a specification requires the user's direction. Predicate evaluation happens after inspection against returned observations; it does not trigger a second inspection.

## Requirements and installation

Requirements: an agent client that supports the Agent Skills `SKILL.md` format and authenticated remote MCP, Node.js 18 or newer for screenshot operations, and a Vispector API key with MCP access. Set `VISPECTOR_MCP_URL` to the Streamable HTTP endpoint (for example `https://<host>/mcp/`) and `VISPECTOR_MCP_TOKEN` to the API key in the environment used by the agent and runtime. Never put the token in this repository or a skill prompt.

The files are compatible with Codex, Claude Code, and OpenCode. The installer defaults to Codex's `~/.codex/skills`; set `VISPECTOR_SKILLS_DIR` to the skill directory used by another client. Claude Code uses `~/.claude/skills`; OpenCode uses `~/.config/opencode/skills`. These are installation options, not a claim that every client/version has been tested end to end.

Inspect the installer first:

```sh
curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/main/install.sh
```

Install the current `main` checkout:

```sh
curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/main/install.sh | bash
```

Install to Claude Code:

```sh
curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/main/install.sh | VISPECTOR_SKILLS_DIR="$HOME/.claude/skills" bash
```

Install to OpenCode:

```sh
curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/main/install.sh | VISPECTOR_SKILLS_DIR="$HOME/.config/opencode/skills" bash
```

Install a published pinned ref with `curl -fsSL https://raw.githubusercontent.com/vispector/visual-qa/<tag>/install.sh | VISPECTOR_SKILLS_REF=<tag> VISPECTOR_SKILLS_DIR=<skills-directory> bash` after a release tag exists. Re-run the installer to update. To uninstall, remove the five `vis-*` directories and `vispector-visual-qa-runtime` from the same skills directory. The installer replaces only files it owns in those paths.

Read [setup and authentication](docs/setup.md), [skill usage](docs/usage.md), [limitations](docs/limitations.md), and [developer notes](docs/development.md) before production use. Client-specific skill discovery, invocation, and MCP configuration are summarized in the setup and usage guides.

## Current support limits

The authenticated MCP endpoint supports async `decompose_ui`, `run_inspect`, and `get_inspection`. Context and spec CRUD use the organization-scoped management tools. Some Phase 5 capabilities remain unavailable: natural-language saved specification assertions and taxonomy-folder Workbench deep links. Project and specification editor links are supported when the Workbench base URL is configured. The skills must report limits rather than claim success.
