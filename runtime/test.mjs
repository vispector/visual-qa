import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readImage, VispectorMCP } from './mcp.mjs';
import { main as runImageCommand } from './upload-image.mjs';

test('readImage resolves paths, identifies PNG, and rejects unsupported bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-runtime-'));
  try {
    const imagePath = join(directory, 'screen.png');
    await writeFile(imagePath, Buffer.from([137,80,78,71,13,10,26,10,0]));
    const image = await readImage(imagePath);
    assert.equal(image.mime, 'image/png');
    assert.equal(image.path, imagePath);
    await writeFile(join(directory, 'bad.png'), Buffer.from('not an image'));
    await assert.rejects(readImage(join(directory, 'bad.png')), /Only valid PNG/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('MCP client initializes and calls tools with bearer auth', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.VISPECTOR_MCP_URL;
  const originalToken = process.env.VISPECTOR_MCP_TOKEN;
  const calls = [];
  process.env.VISPECTOR_MCP_URL = 'https://mcp.example.test/mcp/';
  process.env.VISPECTOR_MCP_TOKEN = 'synthetic-token';
  globalThis.fetch = async (_url, options) => {
    calls.push({ body: JSON.parse(options.body), authorization: options.headers.authorization });
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: calls.at(-1).body.id, result: { content: [{ type: 'text', text: '{"status":"scheduled"}' }] } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const client = new VispectorMCP();
    await client.connect();
    const value = await client.callTool('get_inspection', { inspection_id: 'synthetic-id' });
    assert.deepEqual(value, { status: 'scheduled' });
    assert.equal(calls[0].body.method, 'initialize');
    assert.equal(calls[0].authorization, 'Bearer synthetic-token');
    assert.equal(calls.at(-1).body.method, 'tools/call');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.VISPECTOR_MCP_URL; else process.env.VISPECTOR_MCP_URL = originalUrl;
    if (originalToken === undefined) delete process.env.VISPECTOR_MCP_TOKEN; else process.env.VISPECTOR_MCP_TOKEN = originalToken;
  }
});

test('inspect command submits once and polls the accepted inspection ID', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-e2e-'));
  const imagePath = join(directory, 'screen.png');
  await writeFile(imagePath, Buffer.from([137,80,78,71,13,10,26,10,0]));
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name, args) {
      calls.push({ name, args });
      return name === 'run_inspect'
        ? { inspection_id: 'inspection-fixed', status: 'scheduled', revision_id: 'revision-fixed' }
        : { inspection_id: 'inspection-fixed', status: 'completed', data: { result: 'SUPPORTED' } };
    },
  };
  const oldInterval = process.env.VISPECTOR_POLL_INTERVAL_MS;
  const oldTimeout = process.env.VISPECTOR_POLL_TIMEOUT_MS;
  process.env.VISPECTOR_POLL_INTERVAL_MS = '250';
  process.env.VISPECTOR_POLL_TIMEOUT_MS = '1000';
  try {
    const output = await runImageCommand(['inspect', imagePath, 'sample-project', 'settings/profile'], client);
    assert.equal(output.inspection_id, 'inspection-fixed');
    assert.equal(output.revision_id, 'revision-fixed');
    assert.deepEqual(calls.map((call) => call.name), ['run_inspect', 'get_inspection']);
    assert.equal(calls[0].args.input.taxonomy_path, 'sample-project/settings/profile');
    assert.equal(calls[0].args.input.image.mime_type, 'image/png');
    assert.ok(calls[0].args.input.idempotency_key);
    assert.deepEqual(calls[1].args, { inspection_id: 'inspection-fixed' });
  } finally {
    if (oldInterval === undefined) delete process.env.VISPECTOR_POLL_INTERVAL_MS; else process.env.VISPECTOR_POLL_INTERVAL_MS = oldInterval;
    if (oldTimeout === undefined) delete process.env.VISPECTOR_POLL_TIMEOUT_MS; else process.env.VISPECTOR_POLL_TIMEOUT_MS = oldTimeout;
    await rm(directory, { recursive: true, force: true });
  }
});

test('failed inspection preserves identifiers and remains an execution failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-failed-'));
  const imagePath = join(directory, 'screen.png');
  await writeFile(imagePath, Buffer.from([137,80,78,71,13,10,26,10,0]));
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name, args) {
      calls.push({ name, args });
      return name === 'run_inspect'
        ? { inspection_id: 'failed-id', status: 'scheduled', revision_id: 'rev-id', workspace_version: 'version-id' }
        : { inspection_id: 'failed-id', status: 'failed', execution_error: 'provider unavailable' };
    },
  };
  const oldInterval = process.env.VISPECTOR_POLL_INTERVAL_MS;
  const oldTimeout = process.env.VISPECTOR_POLL_TIMEOUT_MS;
  process.env.VISPECTOR_POLL_INTERVAL_MS = '250';
  process.env.VISPECTOR_POLL_TIMEOUT_MS = '1000';
  try {
    const result = await runImageCommand(['inspect', imagePath, 'sample-project', 'settings/profile'], client);
    assert.equal(result.status, 'failed');
    assert.equal(result.inspection_id, 'failed-id');
    assert.equal(result.revision_id, 'rev-id');
    assert.equal(result.workspace_version, 'version-id');
    assert.equal(result.execution_error, 'provider unavailable');
    assert.deepEqual(calls.map(({ name }) => name), ['run_inspect', 'get_inspection']);
  } finally {
    if (oldInterval === undefined) delete process.env.VISPECTOR_POLL_INTERVAL_MS; else process.env.VISPECTOR_POLL_INTERVAL_MS = oldInterval;
    if (oldTimeout === undefined) delete process.env.VISPECTOR_POLL_TIMEOUT_MS; else process.env.VISPECTOR_POLL_TIMEOUT_MS = oldTimeout;
    await rm(directory, { recursive: true, force: true });
  }
});

test('poll timeout reports the accepted ID and does not resubmit', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-timeout-'));
  const imagePath = join(directory, 'screen.png');
  await writeFile(imagePath, Buffer.from([137,80,78,71,13,10,26,10,0]));
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name, args) {
      calls.push({ name, args });
      return name === 'run_inspect'
        ? { inspection_id: 'pending-id', status: 'scheduled' }
        : { inspection_id: 'pending-id', status: 'running' };
    },
  };
  const oldInterval = process.env.VISPECTOR_POLL_INTERVAL_MS;
  const oldTimeout = process.env.VISPECTOR_POLL_TIMEOUT_MS;
  process.env.VISPECTOR_POLL_INTERVAL_MS = '250';
  process.env.VISPECTOR_POLL_TIMEOUT_MS = '250';
  try {
    await assert.rejects(
      runImageCommand(['inspect', imagePath, 'sample-project', 'settings/profile'], client),
      /timed out after 250ms\. Inspection pending-id remains available/,
    );
    assert.deepEqual(calls.map(({ name }) => name), ['run_inspect', 'get_inspection']);
  } finally {
    if (oldInterval === undefined) delete process.env.VISPECTOR_POLL_INTERVAL_MS; else process.env.VISPECTOR_POLL_INTERVAL_MS = oldInterval;
    if (oldTimeout === undefined) delete process.env.VISPECTOR_POLL_TIMEOUT_MS; else process.env.VISPECTOR_POLL_TIMEOUT_MS = oldTimeout;
    await rm(directory, { recursive: true, force: true });
  }
});
