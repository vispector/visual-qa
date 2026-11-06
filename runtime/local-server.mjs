#!/usr/bin/env node
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readImage, VispectorMCP, sleep } from './mcp.mjs';

const PROTOCOL_VERSION = '2025-03-26';
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const CONTEXT = { value: null };

function toolError(code, message) {
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ code, message }) }] };
}

function parseToolError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Set VISPECTOR_MCP_URL and VISPECTOR_API_KEY/i.test(message)) return { code: 'AUTH_NOT_CONFIGURED', message: 'Set VISPECTOR_MCP_URL and VISPECTOR_API_KEY in the local MCP server environment.' };
  try {
    const parsed = JSON.parse(message.replace(/^Error executing tool [\w.-]+:\s*/, ''));
    if (parsed && typeof parsed.code === 'string') {
      const code = ({ not_found: 'PROJECT_NOT_FOUND', permission_denied: 'PROJECT_ACCESS_DENIED', invalid_argument: 'INVALID_CONTEXT', invalid_spec: 'INVALID_SPEC_CONFIG', image_too_large: 'IMAGE_TOO_LARGE', invalid_image: 'UNSUPPORTED_IMAGE', unsupported_image: 'UNSUPPORTED_IMAGE', image_not_found: 'IMAGE_NOT_FOUND', concurrency_limit: 'CONCURRENCY_LIMIT', rate_limited: 'RATE_LIMITED', insufficient_credits: 'INSUFFICIENT_CREDITS', admission_conflict: 'ADMISSION_CONFLICT', billing_unavailable: 'BILLING_UNAVAILABLE', unsupported_project_type: 'UNSUPPORTED_PROJECT_TYPE' })[parsed.code] || 'UPLOAD_FAILED';
      const safe = {
        PROJECT_NOT_FOUND: 'Project not found or not accessible. Context was not changed.',
        PROJECT_ACCESS_DENIED: 'The API key does not have permission for this project operation.',
        INVALID_CONTEXT: 'The project or taxonomy context is invalid.',
        INVALID_SPEC_CONFIG: 'Vispector rejected its configured UI decomposer specification because its parameter declarations are invalid.',
        IMAGE_TOO_LARGE: 'Image exceeds the configured upload limit.',
        UNSUPPORTED_IMAGE: 'Vispector rejected the image format or content.',
        IMAGE_NOT_FOUND: 'The image path or requested inspection was not found.',
        CONCURRENCY_LIMIT: 'The organization has reached its concurrent inspection limit. Wait for an active inspection to finish.',
        RATE_LIMITED: 'The inspection admission rate limit has been reached. Try again later.',
        INSUFFICIENT_CREDITS: 'The organization has insufficient credits for this inspection.',
        ADMISSION_CONFLICT: 'The inspection admission conflicted with an existing request.',
        BILLING_UNAVAILABLE: 'The billing service is unavailable.',
        UNSUPPORTED_PROJECT_TYPE: 'The project type is not supported for billing.',
        UPLOAD_FAILED: 'Vispector could not complete the image operation.',
      }[code];
      return { code, message: safe };
    }
  } catch { /* map the public text below */ }
  if (/MCP HTTP 403|access_denied|permission_denied/i.test(message)) return { code: 'PROJECT_ACCESS_DENIED', message: 'The API key does not have permission for this project operation.' };
  if (/MCP HTTP 401|authentication required|unauthorized/i.test(message)) return { code: 'AUTH_NOT_CONFIGURED', message: 'Vispector authentication failed. Check the API key configuration.' };
  if (/permission_denied|access denied|forbidden/i.test(message)) return { code: 'PROJECT_ACCESS_DENIED', message: 'The API key does not have access to this project or operation.' };
  if (/not_found|not found/i.test(message)) return { code: 'PROJECT_NOT_FOUND', message: 'The project was not found or is not accessible.' };
  return { code: 'UPLOAD_FAILED', message: 'Vispector could not complete the operation.' };
}

async function resolveContext(input, client) {
  const value = String(input.context || '').trim();
  if (!value || value.includes('\\') || value.includes('%') || value.includes('::')) {
    throw Object.assign(new Error('Context must be project-slug[/taxonomy/prefix].'), { code: 'INVALID_CONTEXT' });
  }
  const parts = value.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || !SLUG.test(part))) {
    throw Object.assign(new Error('Project and taxonomy segments must be lowercase stable slugs.'), { code: 'INVALID_CONTEXT' });
  }
  const slug = parts[0];
  if (!SLUG.test(slug)) throw Object.assign(new Error('Project slug is malformed.'), { code: 'INVALID_CONTEXT' });
  const taxonomyPath = parts.slice(1).join('/');
  await client.connect();

  let project;
  let cursor;
  do {
    const page = await client.callTool('list_projects', { page: { limit: 100, ...(cursor ? { cursor } : {}) } });
    project = (page.items || []).find((item) => item.slug === slug);
    cursor = page.next_cursor || undefined;
  } while (!project && cursor);

  const projectCreated = !project;
  if (projectCreated) {
    project = await client.callTool('create_project', {
      name: slug, slug, project_type: 'visual-qa', idempotency_key: randomUUID(),
    });
  }
  const next = {
    project_id: project.project_id || project.id,
    project_slug: slug,
    project_created: projectCreated,
    taxonomy_path: taxonomyPath,
    revision_id: project.active_revision_id || null,
    workspace_version: project.workspace_version || null,
  };
  if (!next.project_id) throw Object.assign(new Error('Project response did not include an identifier.'), { code: 'PROJECT_NOT_FOUND' });
  CONTEXT.value = next;
  return next;
}

async function poll(client, accepted) {
  if (!accepted?.inspection_id) throw new Error('Vispector did not return an inspection ID.');
  const interval = Math.max(250, Number(process.env.VISPECTOR_POLL_INTERVAL_MS || 1500));
  const timeout = Math.max(interval, Number(process.env.VISPECTOR_POLL_TIMEOUT_MS || 120000));
  const started = Date.now();
  let delay = interval;
  while (Date.now() - started < timeout) {
    await sleep(delay);
    const state = await client.callTool('get_inspection', { inspection_id: accepted.inspection_id });
    if (['completed', 'failed', 'aborted'].includes(state.status)) {
      if (state.status === 'failed') {
        return {
          inspection_id: accepted.inspection_id,
          status: 'failed',
          error_code: state.error_code || 'inspection_execution_error',
          execution_error: 'Inspection failed. The detailed backend error was omitted.',
          revision_id: state.revision_id || accepted.revision_id,
          workspace_version: state.workspace_version || accepted.workspace_version,
        };
      }
      return { ...state, revision_id: state.revision_id || accepted.revision_id, workspace_version: state.workspace_version || accepted.workspace_version };
    }
    if (!['scheduled', 'running'].includes(state.status)) throw new Error(`Unsupported inspection status: ${state.status}`);
    delay = Math.min(Math.round(delay * 1.5), 10000);
  }
  const error = new Error(`Inspection timed out. Inspection ${accepted.inspection_id} remains available for polling; do not resubmit the image.`);
  error.code = 'INSPECTION_TIMEOUT';
  throw error;
}

function sanitizeResult(value, imageBase64, secret = process.env.VISPECTOR_API_KEY || process.env.VISPECTOR_MCP_TOKEN || '') {
  if (typeof value === 'string') {
    let text = value;
    if (imageBase64) text = text.replaceAll(imageBase64, '[image data omitted]');
    if (secret) text = text.replaceAll(secret, '[credential omitted]');
    return text;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeResult(item, imageBase64, secret));
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(data_base64|image_bytes|authorization|api_key|access_token)$/i.test(key)) continue;
      result[key] = sanitizeResult(item, imageBase64, secret);
    }
    return result;
  }
  return value;
}

async function uploadImage(input, client) {
  const mode = input.mode || 'discover';
  let image;
  try {
    image = await readImage(input.path);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') throw Object.assign(new Error('Image path does not exist.'), { code: 'IMAGE_NOT_FOUND' });
    if (/exceeds|limit/i.test(error?.message || '')) throw Object.assign(new Error('Image exceeds the configured upload limit.'), { code: 'IMAGE_TOO_LARGE' });
    if (/Only valid PNG/i.test(error?.message || '')) throw Object.assign(new Error('Only PNG, JPEG, and WebP images are supported.'), { code: 'UNSUPPORTED_IMAGE' });
    throw Object.assign(new Error('Image path must point to a readable regular image file.'), { code: 'IMAGE_NOT_FOUND' });
  }
  await client.connect();
  const encoded = { data_base64: image.bytes.toString('base64'), mime_type: image.mime };
  let accepted;
  if (mode === 'discover') {
    const hint = input.query?.trim()
      ? `Discover visible UI regions relevant to this semantic query, including nested elements: ${input.query.trim()}`
      : 'Discover all visible UI regions, including nested elements, and describe their visible content and relationships.';
    const align_by = input.align_by || 'x';
    const align_gap = input.align_gap === undefined ? 5 : Number(input.align_gap);
    if (!['x', 'y', 'x_or_y', 'x_and_y'].includes(align_by)) throw Object.assign(new Error('align_by must be x, y, x_or_y, or x_and_y.'), { code: 'INVALID_CONTEXT' });
    if (!Number.isInteger(align_gap) || align_gap < 0 || align_gap > 1000) throw Object.assign(new Error('align_gap must be an integer from 0 to 1000 pixels.'), { code: 'INVALID_CONTEXT' });
    accepted = await client.callTool('decompose_ui', { input: { image: encoded, hint, align_by, align_gap, idempotency_key: randomUUID() } });
  } else if (mode === 'inspect') {
    const context = CONTEXT.value;
    if (!context) throw Object.assign(new Error('Set a Vispector project context before inspection.'), { code: 'CONTEXT_NOT_SET' });
    const scope = input.taxonomy_path === undefined ? context.taxonomy_path : String(input.taxonomy_path).replace(/^\/+|\/+$/g, '');
    if (scope && scope.split('/').some((part) => !SLUG.test(part))) throw Object.assign(new Error('Taxonomy scope must contain lowercase stable slugs.'), { code: 'INVALID_CONTEXT' });
    if (!scope) throw Object.assign(new Error('Inspection requires a taxonomy folder or specification; the project root has no inspectable scope.'), { code: 'NO_SPECS' });
    accepted = await client.callTool('run_inspect', { input: {
      project_id: context.project_id,
      taxonomy_path: scope,
      image: encoded,
      idempotency_key: randomUUID(),
    } });
  } else {
    throw Object.assign(new Error("mode must be 'discover' or 'inspect'."), { code: 'INVALID_CONTEXT' });
  }
  return sanitizeResult(await poll(client, accepted), encoded.data_base64);
}

const TOOLS = [
  {
    name: 'vis_set_context',
    description: 'Select process-local context from project-slug[/taxonomy/prefix]. An absent project is created as a Visual QA project; the taxonomy prefix is a logical scope and need not exist yet. Requires project read and, for creation, write permission.',
    inputSchema: { type: 'object', properties: {
      context: { type: 'string', description: 'Required: project-slug[/taxonomy/prefix]. Project lookup or creation is automatic.' },
    }, required: ['context'] },
  },
  { name: 'vis_get_context', description: 'Return the current process-local Vispector project context. Use the vis-context skill for workflow guidance.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'vis_upload_image',
    description: 'Read an image path locally and submit its bytes to authenticated remote Vispector MCP without putting image bytes or base64 in model context. Use mode discover for region discovery or inspect for saved-spec inspection. Use the vis-image or vis-test skill for workflow guidance.',
    inputSchema: { type: 'object', properties: {
      path: { type: 'string' }, mode: { type: 'string', enum: ['discover', 'inspect'] },
      query: { type: 'string' }, taxonomy_path: { type: 'string' },
      align_by: { type: 'string', enum: ['x', 'y', 'x_or_y', 'x_and_y'], description: 'Bounding-box alignment axis; defaults to x.' },
      align_gap: { type: 'integer', minimum: 0, maximum: 1000, description: 'Alignment tolerance in pixels; defaults to 5.' },
    }, required: ['path'] },
  },
];

async function callLocalTool(name, args, client) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return toolError('INVALID_CONTEXT', 'Tool arguments must be an object.');
  try {
    let value;
    if (name === 'vis_get_context') {
      if (!CONTEXT.value) return toolError('CONTEXT_NOT_SET', 'No project context has been selected in this server process.');
      value = CONTEXT.value;
    } else if (name === 'vis_set_context' || name === 'vis_upload_image') {
      client ||= new VispectorMCP();
      value = name === 'vis_set_context' ? await resolveContext(args, client) : await uploadImage(args, client);
    }
    else return toolError('INVALID_CONTEXT', `Unknown tool '${name}'.`);
    return { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value };
  } catch (error) {
    if (error?.code) return toolError(error.code, error.message);
    const mapped = parseToolError(error);
    return toolError(mapped.code, mapped.message);
  }
}

export async function handleMessage(message, client = null) {
  const { id, method, params = {} } = message;
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') return null;
  if (method === 'initialize') return { jsonrpc: '2.0', id, result: {
    protocolVersion: params.protocolVersion || PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: 'vispector-local', version: '0.2.0' },
  } };
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  if (method === 'tools/call') {
    const result = await callLocalTool(params.name, params.arguments || {}, client);
    return { jsonrpc: '2.0', id, result };
  }
  if (id === undefined) return null;
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

const invokedPath = process.argv[1] ? realpathSync(resolve(process.argv[1])) : null;
if (invokedPath && pathToFileURL(invokedPath).href === import.meta.url) {
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  let inputClosed = false;
  let pendingRequests = 0;
  let shuttingDown = false;

  const exitWhenDrained = () => {
    if (inputClosed && pendingRequests === 0 && !shuttingDown) {
      shuttingDown = true;
      process.stdout.end(() => process.exit(0));
    }
  };

  input.on('close', () => {
    inputClosed = true;
    exitWhenDrained();
  });

  input.on('line', async (line) => {
    pendingRequests += 1;
    try {
      const message = JSON.parse(line);
      const response = await handleMessage(message);
      if (response && !inputClosed) process.stdout.write(`${JSON.stringify(response)}\n`);
    } catch {
      if (!inputClosed) process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON-RPC message.' } })}\n`);
    } finally {
      pendingRequests -= 1;
      exitWhenDrained();
    }
  });
}
