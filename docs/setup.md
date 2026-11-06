# Setup and authentication

## Requirements and client options

Use an agent client that reads Agent Skills `SKILL.md` folders and supports both local stdio MCP and authenticated remote MCP. Node.js 18+ and Git are required to run the local MCP server through `npx`; its first launch fetches the package from GitHub. Git and network access are also needed for the skill installer. This repository does not issue credentials or provide a separate remote service.

Set `VISPECTOR_MCP_URL` to the configured endpoint (commonly `https://<service-host>/mcp/`) and `VISPECTOR_API_KEY` to a Vispector API key with MCP permissions. The local stdio server reads the key from its environment and sends it only as the remote HTTP Authorization bearer header. Never put literal keys in skill files, checked-in config, or screenshots. Provide the value through the client's secret/environment mechanism.

The local server exposes `vis_set_context`, `vis_get_context`, and `vis_upload_image` over stdio. It calls the remote Vispector MCP over stateless Streamable HTTP for project resolution, discovery, inspection, and polling. Configure that remote server too when skills need direct specification-management tools. Confirm `server_info` succeeds. Vispector enforces API-key permissions, project authorization, rate limits, billing admission, idempotency, and inspection usage.

### MCP client examples

Claude Code can read the endpoint and token from environment variables in `.mcp.json`:

```json
{
  "mcpServers": {
    "vispector": {
      "type": "http",
      "url": "${VISPECTOR_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${VISPECTOR_API_KEY}"
      }
    }
  }
}
```

OpenCode uses `opencode.json` to start the local stdio server and connect to remote Vispector MCP:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "vispector-local": {
      "type": "local",
      "command": ["npx", "-y", "--package=github:vispector/visual-qa#main", "vispector-local-mcp"],
      "environment": {
        "VISPECTOR_MCP_URL": "{env:VISPECTOR_MCP_URL}",
        "VISPECTOR_API_KEY": "{env:VISPECTOR_API_KEY}",
        "VISPECTOR_WORKING_DIR": "{env:VISPECTOR_WORKING_DIR}",
        "VISPECTOR_MAX_IMAGE_BYTES": "{env:VISPECTOR_MAX_IMAGE_BYTES}"
      },
      "timeout": 180000,
      "enabled": true
    },
    "vispector": {
      "type": "remote",
      "url": "{env:VISPECTOR_MCP_URL}",
      "oauth": false,
      "headers": { "Authorization": "Bearer {env:VISPECTOR_API_KEY}" }
    }
  }
}
```

OpenCode's local `command` starts the stdio server through `npx`; the separately named remote entry gives skills direct access to management tools. Pin a release tag in place of `main` when one is available.

Until the package files are present on the referenced GitHub ref, development checkouts can substitute the local checkout path for the GitHub package spec, for example `--package=/path/to/visual-qa`.

For Codex, configure the local server as a stdio MCP process with command `npx` and arguments `-y --package=github:vispector/visual-qa#main vispector-local-mcp`; configure the remote endpoint as Streamable HTTP in Codex MCP settings. Supply `VISPECTOR_MCP_URL`, `VISPECTOR_API_KEY`, and `VISPECTOR_WORKING_DIR` in the process environment. Keep the key in the client environment or secret store.

For Osaurus, add the local server in **Settings → MCP servers** as a stdio provider. Set command to `npx`, arguments to `-y`, `--package=github:vispector/visual-qa#main`, and `vispector-local-mcp`; provide `VISPECTOR_MCP_URL`, `VISPECTOR_API_KEY`, and `VISPECTOR_WORKING_DIR` in its environment. Add the remote Vispector MCP provider separately for direct management tools. Client UI/config acceptance depends on the installed version and has not yet been exercised for this migration.

`VISPECTOR_MAX_IMAGE_BYTES` defaults to 10 MiB, matching the backend's current default `MAX_IMAGE_UPLOAD_BYTES`; set it no higher than the configured backend limit. The local server accepts PNG, JPEG, and WebP signatures, while Vispector performs authoritative format, decoding, pixel-count, and processing-size validation. Relative image paths resolve against `VISPECTOR_WORKING_DIR`, then the MCP process working directory.

Local tool errors return `isError: true` with JSON text `{ "code": "...", "message": "..." }`. Codes include `CONTEXT_NOT_SET`, `INVALID_CONTEXT`, `PROJECT_NOT_FOUND`, `PROJECT_ACCESS_DENIED`, `AUTH_NOT_CONFIGURED`, `INVALID_SPEC_CONFIG`, `IMAGE_NOT_FOUND`, `UNSUPPORTED_IMAGE`, `IMAGE_TOO_LARGE`, `UPLOAD_FAILED`, `NO_SPECS`, and `INSPECTION_TIMEOUT`. The `vis-image` save workflow also reports `SAVE_NOT_CONFIRMED`, `SAVE_CONFLICT`, and `STALE_PROPOSAL` without writing unapproved changes.

## Install, update, remove

Review `install.sh` before running it. The one-line install uses the public `main` branch. Set `VISPECTOR_SKILLS_REF` to a release tag for a pinned install. Re-running updates the owned skill/runtime files. The installer defaults to `${CODEX_HOME:-$HOME/.codex}/skills`; set `VISPECTOR_SKILLS_DIR` to the target skill root for another client. To remove the installation, delete `vis-context`, `vis-image`, `vis-spec`, `vis-test`, `vis-impl`, and `vispector-visual-qa-runtime` from the selected root.

For local checkout installation, set `VISPECTOR_SKILLS_SOURCE` to the repository path. Published installs use the selected public branch or tag.

### Client documentation

- [Codex skills](https://developers.openai.com/plugins/concepts/skills) and [MCP servers](https://developers.openai.com/codex/mcp)
- [Claude Code skills](https://code.claude.com/docs/en/skills) and [MCP servers](https://code.claude.com/docs/en/mcp)
- [OpenCode skills](https://opencode.ai/docs/skills) and [MCP servers](https://opencode.ai/docs/mcp-servers)
- [Osaurus skills and MCP](https://docs.osaurus.ai/windows/skills-and-mcp)
