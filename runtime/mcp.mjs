#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function readImage(path, workingDirectory = process.env.VISPECTOR_WORKING_DIR || process.cwd()) {
  const absolute = resolve(workingDirectory, path);
  const max = Number(process.env.VISPECTOR_MAX_IMAGE_BYTES || 10 * 1024 * 1024);
  const info = await stat(absolute);
  if (!info.isFile()) throw new Error('Image path must point to a regular file.');
  if (!info.size) throw new Error('Image file is empty.');
  if (info.size > max) throw new Error(`Image is ${info.size} bytes; configured limit is ${max}.`);
  const bytes = await readFile(absolute);
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    ? 'image/png'
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      ? 'image/jpeg'
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
        ? 'image/webp' : null;
  if (!mime) throw new Error('Only valid PNG, JPEG, and WebP image signatures are accepted.');
  if (bytes.length > max) throw new Error(`Image is ${bytes.length} bytes; configured limit is ${max}.`);
  return { path: absolute, bytes, mime };
}

export class VispectorMCP {
  constructor() {
    this.url = process.env.VISPECTOR_MCP_URL;
    this.token = process.env.VISPECTOR_API_KEY || process.env.VISPECTOR_MCP_TOKEN;
    if (!this.url || !this.token) throw new Error('Set VISPECTOR_MCP_URL and VISPECTOR_API_KEY in the local MCP server environment.');
    this.id = 0;
  }
  async rpc(method, params = {}, notification = false) {
    const body = { jsonrpc: '2.0', method, params };
    if (!notification) body.id = ++this.id;
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.VISPECTOR_MCP_HTTP_TIMEOUT_MS || 60000)),
    });
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${await response.text()}`);
    if (notification || response.status === 202) return undefined;
    const type = response.headers.get('content-type') || '';
    if (type.includes('text/event-stream')) {
      const lines = (await response.text()).split(/\r?\n/).filter((line) => line.startsWith('data:'));
      const last = lines.at(-1)?.slice(5).trim();
      if (!last) throw new Error('MCP returned an empty event stream.');
      const message = JSON.parse(last);
      if (message.error) throw new Error(message.error.message || JSON.stringify(message.error));
      return message.result;
    }
    const message = await response.json();
    if (message.error) throw new Error(message.error.message || JSON.stringify(message.error));
    return message.result;
  }
  async connect() {
    await this.rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'vispector-visual-qa-skill', version: '0.1.0' } });
    await this.rpc('notifications/initialized', {}, true);
  }
  async callTool(name, args) {
    const result = await this.rpc('tools/call', { name, arguments: args });
    if (result?.isError) throw new Error(result.content?.map((item) => item.text || '').join('\n') || `${name} failed`);
    const texts = result?.content?.filter((item) => item.type === 'text').map((item) => item.text) || [];
    if (texts.length === 1) {
      try { return JSON.parse(texts[0]); } catch { /* retain native result below */ }
    }
    return result?.structuredContent ?? result;
  }
}

export const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
export const key = () => randomUUID();
