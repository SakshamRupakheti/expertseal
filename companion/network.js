import http from 'node:http';
import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import robotsParser from 'robots-parser';

export function publicAddress(address) {
  try { return ipaddr.parse(address).range() === 'unicast'; } catch { return false; }
}
export function sourceUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || url.href.length > 2048) throw new Error('Unsafe source URL.');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost')) throw new Error('Private source blocked.');
  url.hash = '';
  return url;
}
// DNS is checked once and pinned to the socket. Redirects are never followed.
export async function request(urlValue, { local = false, json, headers = {}, maxBytes = 512000, timeout = 12000, signal, resolver = lookup } = {}) {
  const url = new URL(urlValue);
  const loopback = local && url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password;
  if (!loopback) sourceUrl(url.href);
  const abort = AbortSignal.any([AbortSignal.timeout(timeout), ...(signal ? [signal] : [])]);
  const addresses = loopback ? [{address:'127.0.0.1',family:4}] : await Promise.race([
    resolver(url.hostname, {all:true}),
    new Promise((_, reject) => abort.addEventListener('abort', () => reject(new Error('DNS timeout.')), {once:true}))
  ]);
  if (!addresses.length || (!loopback && addresses.some(a => !publicAddress(a.address)))) throw new Error('Private source blocked.');
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const body = json === undefined ? undefined : JSON.stringify(json);
    const req = (url.protocol === 'https:' ? https : http).request(url, {
      method: body ? 'POST' : 'GET', signal:abort, agent:false,
      lookup: (_host, options, callback) => options.all ? callback(null,[pinned]) : callback(null,pinned.address,pinned.family),
      headers: {'User-Agent':'ExpertSealResearch/2.0', Accept:'application/json, text/html;q=0.8', ...headers,
        ...(body ? {'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)} : {})}
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400) { res.destroy(); reject(new Error('Source redirect blocked.')); return; }
      const chunks = []; let length = 0;
      res.on('data', chunk => { length += chunk.length; if (length > maxBytes) {reject(new Error('Source response too large.'));res.destroy();} else chunks.push(chunk); });
      res.on('error', reject);
      res.on('end', () => resolve({status:res.statusCode, type:res.headers['content-type'] || '', text:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error', () => reject(new Error('Source request failed or timed out.')));
    req.end(body);
  });
}
export async function getJson(url, options) {
  const response = await request(url, options);
  if (response.status !== 200 || !response.type.includes('json')) throw new Error('Service unavailable or JSON API disabled.');
  try { return JSON.parse(response.text); } catch { throw new Error('Invalid service JSON.'); }
}
export async function fetchSource(urlValue, policies, signal, requester=request) {
  const url = sourceUrl(urlValue);
  const policy = policies.find(p => p.origin === url.origin);
  if (!policy) throw new Error('Source origin requires operator approval.');
  // Explicit origin approval records terms review, not blanket permission to bypass robots.
  const robotsUrl = new URL('/robots.txt', url).href;
  const robots = await requester(robotsUrl, {signal,maxBytes:64000});
  if (robots.status !== 404 && (robots.status !== 200 || robotsParser(robotsUrl, robots.text).isAllowed(url.href, 'ExpertSealResearch') !== true)) throw new Error('Source disallows automated collection.');
  const delay = robots.status === 200 ? robotsParser(robotsUrl, robots.text).getCrawlDelay('ExpertSealResearch') : 0;
  if (delay > 0) throw new Error('Source crawl-delay requires manual review.');
  const response = await requester(url, {signal});
  if (response.status !== 200 || !response.type.includes('text/html')) throw new Error('Public HTML source unavailable.');
  return {url:url.href, html:response.text, sourceType:policy.type, retrievedAt:new Date().toISOString()};
}
