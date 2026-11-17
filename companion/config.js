import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const endpoint = z.string().url().refine(value => {
  const u = new URL(value);
  return !u.username && !u.password && !u.search && !u.hash && u.pathname === '/' &&
    (u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === '127.0.0.1'));
}, 'Use a public HTTPS origin or explicit 127.0.0.1 HTTP origin.');
export const configSchema = z.object({
  extensionOrigin:z.string().regex(/^chrome-extension:\/\/[a-p]{32}$/),
  token:z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
  searxng:endpoint.default('http://127.0.0.1:8080/'),
  ollama:endpoint.refine(v=>new URL(v).hostname==='127.0.0.1' && new URL(v).protocol==='http:','Ollama must run on loopback.').default('http://127.0.0.1:11434/'),
  model:z.enum(['qwen3.5:2b','qwen3.5:4b','none']).default('qwen3.5:2b'),
  ollamaDevice:z.enum(['cpu','auto']).default('cpu'),
  sourceOrigins:z.array(z.object({origin:z.string().url().refine(v => new URL(v).origin === v && v.startsWith('https://')), type:z.enum(['institutional','self_reported','original_work'])}).strict()).max(30).default([]),
  openalex:z.boolean().default(true),
  openalexKey:z.string().max(256).default(''),
  orcidToken:z.string().max(2048).default('')
}).strict();
export function loadConfig() {
  if (!process.env.EXPERTSEAL_CONFIG) throw new Error('Set EXPERTSEAL_CONFIG to your private configuration file.');
  return configSchema.parse(JSON.parse(readFileSync(process.env.EXPERTSEAL_CONFIG,'utf8')));
}
export function configurationId(config) { return createHash('sha256').update(JSON.stringify(config)).digest('hex'); }
export function newToken() { return randomBytes(32).toString('base64url'); }
