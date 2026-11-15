(() => {
  const $ = id => document.getElementById(id);
  const providers = {
    gemini: { link: 'https://aistudio.google.com/app/apikey', name: 'Gemini', description: 'Gemini 2.5 Flash-Lite + Google Search. Free-tier quotas apply; use a project without paid billing for a free test. Google may use free-tier inputs to improve its products.' },
    openai: { link: 'https://platform.openai.com/api-keys', name: 'OpenAI', description: 'GPT-4o Search adapter. Paid API usage, separate from ChatGPT subscriptions. Experimental: not live-tested in this release.' },
    perplexity: { link: 'https://www.perplexity.ai/settings/api', name: 'Perplexity', description: 'Sonar search adapter. Uses your own API credits. Experimental: not live-tested in this release.' }
  };
  let saved = { provider: 'gemini', configured: {} };
  if (new URLSearchParams(location.search).get('view') === 'full') document.body.classList.add('full-page');
  async function send(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.success) throw new Error(response?.error || 'Extension unavailable. Reload it and try again.');
    return response;
  }
  function notice(message, error = false) { $('notice').textContent = message; $('notice').classList.toggle('error', error); }
  function update() {
    const provider = $('provider').value;
    const config = providers[provider];
    $('provider-description').textContent = config.description;
    $('key-link').href = config.link; $('key-link').textContent = `Get a ${config.name} key ↗`;
    $('api-key').placeholder = saved.configured[provider] ? 'Key saved · paste only to replace' : 'Paste your key here';
    $('saved-status').textContent = saved.configured[provider] ? 'KEY SAVED' : '';
    $('remove-key').disabled = !saved.configured[provider];
    const ready = saved.configured[saved.provider];
    $('status').textContent = ready ? 'Ready' : 'Key needed'; $('status').classList.toggle('ready', Boolean(ready));
  }
  async function stats() { const res = await send({ action: 'getCacheStats' }); $('checks').textContent = res.totalVerifications; $('cached').textContent = res.cachedCreators; }
  $('provider').addEventListener('change', () => { $('api-key').value = ''; update(); });
  $('save').addEventListener('click', async () => {
    $('save').disabled = true;
    try {
      const response = await send({ action: 'saveSettings', provider: $('provider').value, apiKey: $('api-key').value });
      saved = response.settings; $('api-key').value = ''; update(); notice('Settings saved in this browser.');
    } catch (e) { notice(e.message, true); } finally { $('save').disabled = false; }
  });
  $('api-key').addEventListener('keydown', e => { if (e.key === 'Enter') $('save').click(); });
  $('remove-key').addEventListener('click', async () => {
    try { saved = (await send({ action: 'removeKey', provider: $('provider').value })).settings; $('api-key').value = ''; update(); notice('Key removed from this browser.'); }
    catch (e) { notice(e.message, true); }
  });
  $('verify').addEventListener('click', async () => {
    let creator;
    try {
      creator = globalThis.ExpertSealIdentity.normalizeCreator({ profileUrl: $('profile-url').value.trim(), displayName: $('creator-name').value.trim() });
      if ($('api-key').value.trim() || $('provider').value !== saved.provider) throw new Error('Save your provider settings first.');
    } catch (e) { notice(e.message, true); return; }
    $('verify').disabled = true; $('progress').textContent = 'Researching public sources… this may take up to a minute. Keep this page open.';
    $('result').hidden = true; notice('');
    try {
      const response = await send({ action: 'verify', creator });
      $('result').hidden = false;
      const root = $('result').shadowRoot || $('result').attachShadow({ mode: 'open' });
      globalThis.ExpertSealReport.render(root, response);
      $('progress').textContent = response.cached ? 'Loaded a saved report. Clear reports to run a fresh check.' : 'Research complete. Review the sources and limitations below.';
      await stats();
    } catch (e) { $('progress').textContent = ''; notice(e.message, true); }
    finally { $('verify').disabled = false; }
  });
  $('clear-cache').addEventListener('click', async () => { try { await send({ action: 'clearCache' }); await stats(); $('result').hidden = true; notice('Saved reports cleared. Your keys are unchanged.'); } catch (e) { notice(e.message, true); } });
  $('open-tab').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') + '?view=full' }));
  (async () => { try { saved = (await send({ action: 'getSettings' })).settings; $('provider').value = saved.provider; update(); await stats(); }
    catch (e) { $('status').textContent = 'Unavailable'; notice(e.message, true); } })();
})();
