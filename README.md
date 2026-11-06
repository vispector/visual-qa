# Vispector Visual QA skills

This repository distributes five Agent Skills (`SKILL.md`) plus a local stdio MCP server: project context, image discovery and specification proposals, Visual QA specification management, screenshot testing, and implementation verification. The local server reads image paths and sends base64 directly to the authenticated remote Vispector MCP using the configured bearer API key; image bytes never enter model context. Vispector remains responsible for authorization, revision selection, inspection execution, and billing.

## Workflow

Configure local and remote MCP access, install the skills, establish context with `vis-context`, use `vis-context show` or `vis-context list`, then use `vis-image`, `vis-spec`, `vis-test`, and `vis-impl` as needed. Discovery only proposes candidates. Saving a specification requires explicit confirmation of the presented proposal. Predicate evaluation happens after inspection against returned observations; it does not trigger a second inspection.

The local server executable is `vispector-local-mcp`. To start it directly from the repository's published GitHub ref:

```sh
npx -y --package=github:vispector/visual-qa#main vispector-local-mcp
```

MCP clients should use the same command and pass `VISPECTOR_MCP_URL`, `VISPECTOR_API_KEY`, and `VISPECTOR_WORKING_DIR` in the server environment. The referenced GitHub ref must contain the package manifest and local server.

## Requirements and installation

Requirements: an agent client that supports the Agent Skills `SKILL.md` format and local stdio plus authenticated remote MCP, Node.js 18 or newer, Git, and a Vispector API key with MCP permissions. The client starts the local server with `npx`; its first launch fetches this GitHub package. Set `VISPECTOR_MCP_URL` to the Streamable HTTP endpoint (for example `https://<host>/mcp/`) and `VISPECTOR_API_KEY` in the local server's environment. This is the same bearer credential used for remote MCP access. Set `VISPECTOR_WORKING_DIR` to the base directory for relative image paths, or use the MCP client's working directory. Never put the token in this repository, a skill, or a model-visible configuration file.

The files are compatible with Codex, Claude Code, and OpenCode. The installer defaults to Codex's `~/.codex/skills`; set `VISPECTOR_SKILLS_DIR` to the skill directory used by another client. Claude Code uses `~/.claude/skills`; OpenCode uses `~/.config/opencode/skills`. These are installation options, not a claim that every client/version has been tested end to end.

Read [setup and authentication](docs/setup.md), [skill usage](docs/usage.md), [behavior and errors](docs/limitations.md), and [developer notes](docs/development.md) for local-server configuration, context lifetime, errors, and the five supported skills.

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

Read [setup and authentication](docs/setup.md), [skill usage](docs/usage.md), [behavior and errors](docs/limitations.md), and [developer notes](docs/development.md) before production use. Client-specific skill discovery, invocation, and MCP configuration are summarized in the setup and usage guides.

## Supported capabilities

The authenticated MCP endpoint supports async `decompose_ui`, `run_inspect`, and `get_inspection`; context and spec operations use the organization-scoped management tools. Visual QA specifications support a screen-level assertion through `semantic_context`, region and attention checks, and taxonomy-scoped inspection. Workbench links are available for projects and specifications when the Workbench base URL is configured; taxonomy folders do not have a direct Workbench route.
