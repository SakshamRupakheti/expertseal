import '../lib/identity.js';
import { research, CACHE_VERSION, CACHE_TTL } from '../lib/verification.js';
const { normalizeCreator, platformForHost } = globalThis.ExpertSealIdentity;
const PROVIDERS = ['tavily', 'gemini', 'openai', 'perplexity'];
const KEY_FIELDS = ['apiKey', 'apiKeys', 'geminiApiKey', 'openaiApiKey', 'perplexityApiKey'];
const inFlight = new Map();
let settingsQueue = Promise.resolve();
let cacheEpoch = 0;
const ready = (async () => {
  await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  await chrome.storage.sync.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const local = await chrome.storage.local.get(['settingsV2']);
  if (!local.settingsV2) {
    const old = await chrome.storage.sync.get(['provider', ...KEY_FIELDS]);
    const provider = PROVIDERS.includes(old.provider) ? old.provider : 'gemini';
    const keys = Object.fromEntries(PROVIDERS.map(p => [p, old[`${p}ApiKey`] || old.apiKeys?.[p] || (provider === p ? old.apiKey : '') || '']));
    await chrome.storage.local.set({ settingsV2: { provider, keys }, totalVerifications: 0 });
  }
  await chrome.storage.sync.remove(KEY_FIELDS);
})();
ready.catch(() => {});
async function settings() {
  await ready;
  return (await chrome.storage.local.get('settingsV2')).settingsV2;
}
async function publicSettings() {
  const saved = await settings();
  return { provider: saved.provider, configured: Object.fromEntries(PROVIDERS.map(p => [p, Boolean(saved.keys[p])])) };
}
function isSettingsPage(sender) {
  return sender.id === chrome.runtime.id && sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('popup/popup.html');
}
function isSocialPage(sender) {
  try { return sender.id === chrome.runtime.id && Boolean(sender.tab) && new URL(sender.url).protocol === 'https:' && Boolean(platformForHost(new URL(sender.url).hostname)); }
  catch { return false; }
}
function cacheKey(creator, provider) {
  const identity = creator.profileUrl.includes('/channel/') ? creator.profileUrl : creator.profileUrl.toLowerCase();
  return `es_v${CACHE_VERSION}_${provider}_${identity}`;
}
async function verify(input, refresh = false) {
  const creator = normalizeCreator(input);
  const saved = await settings();
  const provider = saved.provider;
  const key = saved.keys[provider];
  if (!key) throw new Error('No API key saved. Open ExpertSeal settings and add your own key.');
  const id = cacheKey(creator, provider);
  if (!refresh) {
    const cached = (await chrome.storage.local.get(id))[id];
    const age = Date.now() - cached?.timestamp;
    if (cached?.version === CACHE_VERSION && age >= 0 && age < CACHE_TTL) return { ...cached, cached: true };
  }
  if (inFlight.has(id)) return inFlight.get(id);
  if (inFlight.size >= 2) throw new Error('Two creator checks are already running. Wait for one to finish.');
  const epoch = cacheEpoch;
  const task = (async () => {
    const data = await research(provider, key, creator);
    const result = { data, creator, provider, timestamp: Date.now(), version: CACHE_VERSION, cached: false };
    if (epoch === cacheEpoch) await chrome.storage.local.set({ [id]: result });
    const countWrite = settingsQueue.then(async () => {
      const { totalVerifications = 0 } = await chrome.storage.local.get('totalVerifications');
      await chrome.storage.local.set({ totalVerifications: totalVerifications + 1 });
    });
    settingsQueue = countWrite.catch(() => {});
    await countWrite;
    return result;
  })();
  inFlight.set(id, task);
  try { return await task; } finally { inFlight.delete(id); }
}
export async function dispatch(message, sender) {
  await ready;
  if (!message || typeof message !== 'object') throw new Error('Invalid request.');
  const own = isSettingsPage(sender);
  const social = isSocialPage(sender);
  if (!own && !social) throw new Error('This page cannot use ExpertSeal.');
  if (message.action === 'openSettings') { await chrome.runtime.openOptionsPage(); return {}; }
  if (message.action === 'verify') {
    const creator = normalizeCreator(message.creator);
    if (social && creator.platform !== platformForHost(new URL(sender.url).hostname)) throw new Error('Creator platform does not match this page.');
    return verify(creator, message.refresh === true);
  }
  if (!own) throw new Error('Open the extension settings to perform this action.');
  if (message.action === 'getSettings') return { settings: await publicSettings() };
  if (message.action === 'saveSettings' || message.action === 'removeKey') {
    if (!PROVIDERS.includes(message.provider)) throw new Error('Invalid provider.');
    const write = settingsQueue.then(async () => {
      const saved = await settings();
      if (message.action === 'removeKey') saved.keys[message.provider] = '';
      else {
        if (typeof message.apiKey === 'string' && message.apiKey.trim()) {
          const key = message.apiKey.trim();
          if (key.length < 20 || key.length > 1024 || /\s/.test(key)) throw new Error('That API key format looks incomplete. Paste the complete key.');
          saved.keys[message.provider] = key;
        }
        saved.provider = message.provider;
      }
      await chrome.storage.local.set({ settingsV2: saved });
    });
    settingsQueue = write.catch(() => {});
    await write;
    return { settings: await publicSettings() };
  }
  if (message.action === 'clearCache') {
    cacheEpoch++;
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter(k => k.startsWith('es_v') || k.startsWith('cache_') || k.startsWith('es_cache_'));
    await chrome.storage.local.remove(keys);
    return { cleared: keys.length };
  }
  if (message.action === 'getCacheStats') {
    const all = await chrome.storage.local.get(null);
    return { totalVerifications: all.totalVerifications || 0,
      cachedCreators: Object.entries(all).filter(([k, v]) => k.startsWith(`es_v${CACHE_VERSION}_`) && Date.now() - v.timestamp >= 0 && Date.now() - v.timestamp < CACHE_TTL).length };
  }
  throw new Error('Unknown extension action.');
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  dispatch(message, sender).then(result => sendResponse({ success: true, ...result }))
    .catch(error => sendResponse({ success: false, error: error.message || 'ExpertSeal could not complete the request.' }));
  return true;
});
