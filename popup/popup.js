(() => {
  const $ = id => document.getElementById(id);
  const providers = {
    tavily: { link: 'https://app.tavily.com/', name: 'Tavily', description: 'Career, education, publications and social profiles. A fresh report uses up to 4 basic search credits; the free plan includes 1,000 credits/month. Keep pay-as-you-go disabled. No Gemini key needed.' },
    gemini: { link: 'https://aistudio.google.com/app/apikey', name: 'Gemini', description: 'Gemini 2.5 Flash-Lite + Google Search. Free-tier quotas apply; use a project without paid billing for a free test. Google may use free-tier inputs to improve its products.' },
    openai: { link: 'https://platform.openai.com/api-keys', name: 'OpenAI', description: 'GPT-4o Search adapter. Paid API usage, separate from ChatGPT subscriptions. Experimental: not live-tested in this release.' },
    perplexity: { link: 'https://www.perplexity.ai/settings/api', name: 'Perplexity', description: 'Sonar search adapter. Uses your own API credits. Experimental: not live-tested in this release.' }
  };
  let saved = { provider: 'tavily', configured: {} }, researching = false;
  if (new URLSearchParams(location.search).get('view') === 'full') document.body.classList.add('full-page');
  const params=new URLSearchParams(location.search);
  $('profile-url').value=params.get('profile') || '';
  $('creator-name').value=(params.get('name') || '').slice(0,160);
  async function send(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.success) {
      if (response?.error === 'Invalid provider.' || response?.error === 'Unknown extension action.') throw new Error('ExpertSeal needs a full reload. Close this page, open edge://extensions (or chrome://extensions), click Reload on ExpertSeal, then reopen settings. Your saved keys stay in this browser.');
      throw new Error(response?.error || 'Extension unavailable. Reload it and try again.');
    }
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
  function showReport(response) {
    $('result').hidden=false;
    const root=$('result').shadowRoot || $('result').attachShadow({mode:'open'});
    globalThis.ExpertSealReport.render(root,response);
    $('progress').textContent=response.cached ? 'Opened a saved report. No API credits used.' : response.data?.partial ? 'Some searches failed. Review section errors; this partial report was not cached.' : 'Research complete. Review the sources and identity matches.';
  }
  async function history() {
    const res=await send({action:'getHistory'});$('history').replaceChildren();
    if (!res.reports?.length) {$('history').textContent='No saved reports yet.';return;}
    for (const report of res.reports) {
      const row=document.createElement('div');row.className='history-row';
      const open=document.createElement('button');open.type='button';open.className='history-open';
      open.textContent=`${report.creator.displayName || report.creator.username} · ${report.provider} · ${new Date(report.timestamp).toLocaleDateString()}`;
      open.addEventListener('click',async()=>{
        if (researching) {notice('Wait for the current research to finish.');return;}
        try {
          const result=await send({action:'getReport',id:report.id});showReport(result);
          $('profile-url').value=result.creator.profileUrl;$('creator-name').value=result.creator.displayName || '';
          $('creator-context').value=result.creator.context || '';$('linkedin-url').value=result.creator.linkedinUrl || '';
          notice('Saved report opened; your selected provider is unchanged.');
        } catch(e) {notice(e.message,true);}
      });
      const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.setAttribute('aria-label',`Delete report for ${report.creator.username}`);
      remove.addEventListener('click',async()=>{try {await send({action:'deleteReport',id:report.id});$('result').hidden=true;await history();await stats();notice('Report deleted.');} catch(e){notice(e.message,true);}});
      row.append(open,remove);$('history').append(row);
    }
  }
  $('reload-history').addEventListener('click',()=>history().catch(e=>notice(e.message,true)));
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
      creator = globalThis.ExpertSealIdentity.normalizeCreator({ profileUrl: $('profile-url').value.trim(), displayName: $('creator-name').value.trim(), context:$('creator-context').value,linkedinUrl:$('linkedin-url').value.trim() });
      if ($('api-key').value.trim() || $('provider').value !== saved.provider) throw new Error('Save your provider settings first.');
    } catch (e) { notice(e.message, true); return; }
    researching=true;$('verify').disabled = true; $('progress').textContent = 'Researching public sources… this may take up to a minute. Keep this page open.';
    $('result').hidden = true; notice('');
    try {
      const response = await send({ action: 'verify', creator });
      showReport(response);
      await stats();await history();
    } catch (e) { $('progress').textContent = ''; notice(e.message, true); }
    finally { researching=false;$('verify').disabled = false; }
  });
  $('clear-cache').addEventListener('click', async () => { try { await send({ action: 'clearCache' }); await stats();await history(); $('result').hidden = true; notice('Saved reports cleared. Your keys are unchanged.'); } catch (e) { notice(e.message, true); } });
  $('open-tab').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') + '?view=full' }));
  (async () => { try { saved = (await send({ action: 'getSettings' })).settings; $('provider').value = saved.provider; update(); await stats();await history(); }
    catch (e) { $('status').textContent = 'Unavailable'; notice(e.message, true); } })();
})();
