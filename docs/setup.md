# Setup and authentication

## Supported environment

The installer currently targets Codex skills on macOS and Linux. Use Node.js 18+, Git, and network access to GitHub. The MCP service must be deployed with Streamable HTTP and API-key authentication. This repository does not issue credentials or provide a separate service.

Set `VISPECTOR_MCP_URL` to the configured endpoint (commonly `https://<service-host>/mcp/`) and `VISPECTOR_MCP_TOKEN` (or `VISPECTOR_API_KEY`) to a Vispector API key that has MCP permissions. Set them in the environment inherited by Codex. Do not put keys in shell history, skill files, checked-in MCP config, or screenshots. The bundled runtime sends the token only in the HTTP Authorization header and does not print it.

The runtime uses MCP initialization and `tools/call` over stateless Streamable HTTP. Configure the same endpoint and token in the Codex MCP client for direct management-tool use from the skills. The MCP endpoint uses a trailing slash in the documented deployments. Confirm that `server_info` succeeds before using project tools. API keys, organization permissions, project authorization, rate limits, billing admission, and inspection usage are enforced by Vispector.

`VISPECTOR_MAX_IMAGE_BYTES` defaults to 10 MiB to match the documented server default. If the service's `MAX_IMAGE_UPLOAD_BYTES` differs, set the client limit to the same or a lower value. The server still performs authoritative format, pixel-count, and processing-size validation.

## Install, update, remove

Review `install.sh` before running it. The one-line install uses the public `main` branch. Set `VISPECTOR_SKILLS_REF` to a release tag for a pinned install. Re-running updates the owned skill/runtime files. To remove the installation, delete only `vis-context`, `vis-list-areas`, `vis-spec`, `vis-test`, `vis-impl`, and `vispector-visual-qa-runtime` from `$CODEX_HOME/skills` (default `~/.codex/skills`).

The installer has not been tested against a published public repository/ref in this checkout. Public availability, clean-machine installation, and release pinning remain acceptance items until the repository and release are published.
