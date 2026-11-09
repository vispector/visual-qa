import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleMessage } from './local-server.mjs';

test('initializes as stdio MCP and advertises the local tools', async () => {
  const initialized = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, {});
  assert.equal(initialized.result.serverInfo.name, 'vispector-local');
  const listed = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, {});
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ['vis_set_context', 'vis_get_context', 'vis_upload_image']);
  const setContext = listed.result.tools.find((tool) => tool.name === 'vis_set_context');
  assert.deepEqual(setContext.inputSchema.required, ['context']);
  assert.deepEqual(Object.keys(setContext.inputSchema.properties), ['context']);
  const unset = await handleMessage({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'vis_get_context', arguments: {} } }, {});
  assert.equal(JSON.parse(unset.result.content[0].text).code, 'CONTEXT_NOT_SET');
});

test('project-root context is valid and does not enumerate specs or taxonomy nodes', async () => {
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name, args) {
      calls.push(name);
      assert.equal(name, 'list_projects');
      assert.equal(args.page.limit, 100);
      return { items: [{ project_id: 'root-project', slug: 'sample', active_revision_id: 'rev-1' }] };
    },
  };
  const result = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'sample' } } }, client);
  assert.equal(result.result.structuredContent.taxonomy_path, '');
  assert.deepEqual(calls, ['list_projects']);
});

test('rejects malformed context syntax before remote discovery', async () => {
  const result = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'Sample/../settings' } } }, {
    async connect() { throw new Error('should not connect'); },
  });
  assert.equal(JSON.parse(result.result.content[0].text).code, 'INVALID_CONTEXT');
});

test('creates missing projects only when explicitly requested and preserves context on failure', async () => {
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === 'list_projects') return { items: [] };
      if (name === 'create_project') {
        assert.equal(args.slug, 'sample');
        assert.equal(args.name, 'sample');
        assert.equal(args.project_type, 'visual-qa');
        assert.ok(args.idempotency_key);
        return { project_id: 'project-1', active_revision_id: 'rev-2', workspace_version: 'ws-2' };
      }
      throw new Error(`unexpected tool ${name}`);
    },
  };
  const set = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'sample/settings' } } }, client);
  assert.equal(JSON.parse(set.result.content[0].text).code, 'PROJECT_NOT_FOUND');
  assert.deepEqual(calls.map((call) => call.name), ['list_projects']);
  const created = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'sample/settings', create_if_missing: true } } }, client);
  assert.deepEqual(created.result.structuredContent, {
    project_id: 'project-1', project_slug: 'sample', project_created: true, taxonomy_path: 'settings', revision_id: 'rev-2', workspace_version: 'ws-2',
  });
  assert.deepEqual(calls.map((call) => call.name), ['list_projects', 'list_projects', 'create_project']);
});

test('reads image bytes inside local MCP, submits base64 once remotely, and returns only real inspection evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-local-mcp-'));
  const path = join(directory, 'screen.png');
  const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  await writeFile(path, bytes);
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name, args) {
      calls.push({ name, args });
      if (name === 'run_inspect') return { inspection_id: 'inspect-1', status: 'scheduled', revision_id: 'rev-1' };
      if (name === 'get_inspection') return { inspection_id: 'inspect-1', status: 'completed', data: { result: 'SUPPORTED' }, request: { data_base64: bytes.toString('base64'), authorization: 'Bearer synthetic-secret' } };
      throw new Error(`unexpected tool ${name}`);
    },
  };
  const oldInterval = process.env.VISPECTOR_POLL_INTERVAL_MS;
  const oldTimeout = process.env.VISPECTOR_POLL_TIMEOUT_MS;
  const oldApiKey = process.env.VISPECTOR_API_KEY;
  process.env.VISPECTOR_POLL_INTERVAL_MS = '250';
  process.env.VISPECTOR_POLL_TIMEOUT_MS = '1000';
  process.env.VISPECTOR_API_KEY = 'synthetic-secret';
  try {
    await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'sample/settings' } } }, {
      ...client,
      async callTool(name, args) {
        if (name === 'list_projects') return { items: [{ project_id: 'project-1', slug: 'sample', active_revision_id: 'rev-1' }] };
        if (name === 'resolve_taxonomy_context') return { taxonomy_path: args.context_uri.split('/').slice(1).join('/'), revision_id: 'rev-1' };
        return client.callTool(name, args);
      },
    });
    const response = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'vis_upload_image', arguments: { path, mode: 'inspect' } } }, client);
    const accepted = calls.find((call) => call.name === 'run_inspect');
    assert.equal(accepted.args.input.project_id, 'project-1');
    assert.equal(accepted.args.input.taxonomy_path, 'settings');
    assert.equal(accepted.args.input.image.data_base64, bytes.toString('base64'));
    assert.ok(accepted.args.input.idempotency_key);
    assert.deepEqual(calls.map((call) => call.name), ['run_inspect', 'get_inspection']);
    assert.equal(JSON.stringify(response).includes(bytes.toString('base64')), false);
    assert.equal(JSON.stringify(response).includes('synthetic-secret'), false);
    assert.deepEqual(response.result.structuredContent.data, { result: 'SUPPORTED' });
  } finally {
    if (oldInterval === undefined) delete process.env.VISPECTOR_POLL_INTERVAL_MS; else process.env.VISPECTOR_POLL_INTERVAL_MS = oldInterval;
    if (oldTimeout === undefined) delete process.env.VISPECTOR_POLL_TIMEOUT_MS; else process.env.VISPECTOR_POLL_TIMEOUT_MS = oldTimeout;
    if (oldApiKey === undefined) delete process.env.VISPECTOR_API_KEY; else process.env.VISPECTOR_API_KEY = oldApiKey;
    await rm(directory, { recursive: true, force: true });
  }
});

test('discovery and root-scope image errors do not leak image bytes or trigger invalid remote submissions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-local-errors-'));
  const path = join(directory, 'screen.png');
  await writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  let calls = 0;
  const client = { async connect() {}, async callTool() { calls += 1; return { items: [{ project_id: 'root-project', slug: 'sample' }] }; } };
  const original = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'sample' } } }, client);
  assert.equal(original.result.isError, undefined);
  const before = calls;
  const result = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'vis_upload_image', arguments: { path, mode: 'inspect' } } }, client);
  assert.equal(JSON.parse(result.result.content[0].text).code, 'NO_SPECS');
  assert.equal(calls, before);
  await rm(directory, { recursive: true, force: true });
});

test('reports wrapped remote decomposer errors with their actionable code', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-discovery-error-'));
  const path = join(directory, 'screen.png');
  await writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  try {
    const result = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_upload_image', arguments: { path, mode: 'discover' } } }, {
      async connect() {},
      async callTool() { throw new Error('Error executing tool decompose_ui: {"code": "invalid_spec", "message": "project spec parameter declarations are invalid"}'); },
    });
    assert.equal(JSON.parse(result.result.content[0].text).code, 'INVALID_SPEC_CONFIG');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reports the billing concurrency limit without exposing remote details', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-admission-error-'));
  const path = join(directory, 'screen.png');
  await writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  try {
    const result = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_upload_image', arguments: { path, mode: 'discover' } } }, {
      async connect() {},
      async callTool() { throw new Error('Error executing tool decompose_ui: {"code":"concurrency_limit","message":"remote details"}'); },
    });
    const error = JSON.parse(result.result.content[0].text);
    assert.equal(error.code, 'CONCURRENCY_LIMIT');
    assert.match(error.message, /concurrent inspection limit/);
    assert.doesNotMatch(error.message, /remote details/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('local polling times out with the accepted inspection ID and never resubmits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vispector-local-timeout-'));
  const path = join(directory, 'screen.png');
  await writeFile(path, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  const calls = [];
  const client = {
    async connect() {},
    async callTool(name) {
      calls.push(name);
      if (name === 'list_projects') return { items: [{ project_id: 'project-1', slug: 'sample', active_revision_id: 'rev-1' }] };
      if (name === 'resolve_taxonomy_context') return { taxonomy_path: 'settings', revision_id: 'rev-1' };
      if (name === 'run_inspect') return { inspection_id: 'pending-local', status: 'scheduled' };
      if (name === 'get_inspection') return { inspection_id: 'pending-local', status: 'running' };
      throw new Error(`unexpected tool ${name}`);
    },
  };
  const oldInterval = process.env.VISPECTOR_POLL_INTERVAL_MS;
  const oldTimeout = process.env.VISPECTOR_POLL_TIMEOUT_MS;
  process.env.VISPECTOR_POLL_INTERVAL_MS = '250';
  process.env.VISPECTOR_POLL_TIMEOUT_MS = '250';
  try {
    await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'vis_set_context', arguments: { context: 'sample/settings' } } }, client);
    const result = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'vis_upload_image', arguments: { path, mode: 'inspect' } } }, client);
    assert.equal(JSON.parse(result.result.content[0].text).code, 'INSPECTION_TIMEOUT');
    assert.match(JSON.parse(result.result.content[0].text).message, /pending-local/);
    assert.deepEqual(calls, ['list_projects', 'run_inspect', 'get_inspection']);
  } finally {
    if (oldInterval === undefined) delete process.env.VISPECTOR_POLL_INTERVAL_MS; else process.env.VISPECTOR_POLL_INTERVAL_MS = oldInterval;
    if (oldTimeout === undefined) delete process.env.VISPECTOR_POLL_TIMEOUT_MS; else process.env.VISPECTOR_POLL_TIMEOUT_MS = oldTimeout;
    await rm(directory, { recursive: true, force: true });
  }
});
