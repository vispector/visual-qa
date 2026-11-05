# Setup and authentication

## Requirements and client options

Use an agent client that reads Agent Skills `SKILL.md` folders and can connect to an authenticated remote MCP server. The package provides client-neutral instructions and has documented install options for Codex, Claude Code, and OpenCode; end-to-end behavior still depends on each client's tools and permissions. Screenshot operations also require Node.js 18+, Git, and network access to GitHub for installation. The MCP service must be deployed with Streamable HTTP and API-key authentication. This repository does not issue credentials or provide a separate service.

Set `VISPECTOR_MCP_URL` to the configured endpoint (commonly `https://<service-host>/mcp/`) and `VISPECTOR_MCP_TOKEN` (or `VISPECTOR_API_KEY`) to a Vispector API key that has MCP permissions. Set them in the environment inherited by the agent and the runtime. Do not put literal keys in shell history, skill files, checked-in MCP config, or screenshots. The configuration examples below use environment-variable references rather than storing the secret value. The bundled runtime sends the token only in the HTTP Authorization header and does not print it.

The runtime uses MCP initialization and `tools/call` over stateless Streamable HTTP. Configure the same endpoint and token in the agent's MCP client for direct management-tool use from the skills. The MCP endpoint uses a trailing slash in the documented deployments. Confirm that `server_info` succeeds before using project tools. API keys, organization permissions, project authorization, rate limits, billing admission, and inspection usage are enforced by Vispector.

### MCP client examples

Claude Code can read the endpoint and token from environment variables in `.mcp.json`:

```json
{
  "mcpServers": {
    "vispector": {
      "type": "http",
      "url": "${VISPECTOR_MCP_URL}",
      "headers": {
        "Authorization": "Bearer ${VISPECTOR_MCP_TOKEN}"
      }
    }
  }
}
```

OpenCode uses its `opencode.json` MCP configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "vispector": {
      "type": "remote",
      "url": "{env:VISPECTOR_MCP_URL}",
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:VISPECTOR_MCP_TOKEN}"
      }
    }
  }
}
```

For Codex, add the same remote Streamable HTTP endpoint and bearer token to the MCP configuration supported by your Codex installation. Keep the secret in the client environment or secret store; do not commit a literal token.

`VISPECTOR_MAX_IMAGE_BYTES` defaults to 10 MiB to match the documented server default. If the service's `MAX_IMAGE_UPLOAD_BYTES` differs, set the client limit to the same or a lower value. The server still performs authoritative format, pixel-count, and processing-size validation.

## Install, update, remove

Review `install.sh` before running it. The one-line install uses the public `main` branch. Set `VISPECTOR_SKILLS_REF` to a release tag for a pinned install. Re-running updates the owned skill/runtime files. The installer defaults to `${CODEX_HOME:-$HOME/.codex}/skills`; set `VISPECTOR_SKILLS_DIR` to the target skill root for another client. Use `~/.claude/skills` for Claude Code or `~/.config/opencode/skills` for OpenCode, and make that variable available to the agent's shell when it runs screenshot commands. To remove the installation, delete only `vis-context`, `vis-list-areas`, `vis-spec`, `vis-test`, `vis-impl`, and `vispector-visual-qa-runtime` from the selected root.

The installer has not been tested against a published public repository/ref in this checkout. Public availability, clean-machine installation, and release pinning remain acceptance items until the repository and release are published.

### Client documentation

- [Codex skills](https://developers.openai.com/plugins/concepts/skills) and [MCP servers](https://developers.openai.com/codex/mcp)
- [Claude Code skills](https://code.claude.com/docs/en/skills) and [MCP servers](https://code.claude.com/docs/en/mcp)
- [OpenCode skills](https://opencode.ai/docs/skills) and [MCP servers](https://opencode.ai/docs/mcp-servers)
