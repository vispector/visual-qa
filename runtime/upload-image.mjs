#!/usr/bin/env node
import { readImage, VispectorMCP, sleep, key } from './mcp.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function usage() {
  throw new Error('Usage: upload-image.mjs inspect <image> <project-slug> <taxonomy-path> | decompose <image> <hint> [x-min,y-min,x-max,y-max]');
}

export async function main(argv = process.argv.slice(2), client = new VispectorMCP()) {
  const [action, path, ...args] = argv;
  if (!action || !path) usage();
  const image = await readImage(path);
  await client.connect();
  const encoded = { data_base64: image.bytes.toString('base64'), mime_type: image.mime };
  let accepted;
  if (action === 'inspect') {
    const [projectSlug, taxonomyPath] = args;
    if (!projectSlug || !taxonomyPath) usage();
    accepted = await client.callTool('run_inspect', { input: {
      taxonomy_path: `${projectSlug}/${taxonomyPath.replace(/^\/+/, '')}`,
      image: encoded,
      idempotency_key: key(),
    } });
  } else if (action === 'decompose') {
    const [hint, bounds] = args;
    if (!hint) usage();
    const focus_bounds = bounds ? (() => {
      const values = bounds.split(',').map(Number);
      if (values.length !== 4 || values.some((v) => !Number.isInteger(v) || v < 0 || v > 1000) || values[0] >= values[2] || values[1] >= values[3]) throw new Error('Focus bounds must be x-min,y-min,x-max,y-max in ordered 0-1000 integer coordinates.');
      return { x_min: values[0], y_min: values[1], x_max: values[2], y_max: values[3] };
    })() : undefined;
    accepted = await client.callTool('decompose_ui', { input: { image: encoded, hint, ...(focus_bounds ? { focus_bounds } : {}), idempotency_key: key() } });
  } else usage();

  if (!accepted?.inspection_id) throw new Error(`MCP returned no inspection_id: ${JSON.stringify(accepted)}`);
  const interval = Math.max(250, Number(process.env.VISPECTOR_POLL_INTERVAL_MS || 1500));
  const timeout = Math.max(interval, Number(process.env.VISPECTOR_POLL_TIMEOUT_MS || 120000));
  const started = Date.now();
  let delay = interval;
  while (Date.now() - started < timeout) {
    await sleep(delay);
    const state = await client.callTool('get_inspection', { inspection_id: accepted.inspection_id });
    if (state.status === 'completed' || state.status === 'failed' || state.status === 'aborted') return {
      ...state,
      revision_id: state.revision_id || accepted.revision_id,
      workspace_version: state.workspace_version || accepted.workspace_version,
    };
    if (state.status === 'failed' || state.status === 'aborted') throw new Error(`Inspection ${state.status}: ${state.execution_error || state.error || 'no error details returned'}`);
    if (!['scheduled', 'running'].includes(state.status)) throw new Error(`Unsupported inspection status: ${state.status}`);
    delay = Math.min(Math.round(delay * 1.5), 10000);
  }
  throw new Error(`Inspection timed out after ${timeout}ms. Inspection ${accepted.inspection_id} remains available for polling; do not resubmit the image.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await main();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status === 'failed' || result.status === 'aborted') process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
