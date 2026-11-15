(() => {
  if (globalThis.__EXPERTSEAL_V2__) return;
  globalThis.__EXPERTSEAL_V2__ = true;
  const { parseProfileUrl, platformForHost } = globalThis.ExpertSealIdentity;
  const { render, el } = globalThis.ExpertSealReport;
  const platform = platformForHost(location.hostname);
  if (!platform) return;
  const buttons = new WeakMap();
  let panel = null, sequence = 0, route = location.href, timer;
  function profile(value) { try { return parseProfileUrl(value); } catch { return null; } }
  function creatorIn(container, fallback = '') {
    const links = Array.from(container.querySelectorAll('a[href]'));
    const anchor = links.find(a => profile(a.href)?.platform === platform);
    const identity = profile(anchor?.href || fallback);
    if (!identity) return null;
    let displayName = anchor?.textContent?.trim() || '';
    if (platform === 'youtube') displayName = container.querySelector('#channel-name a, ytd-channel-name a, h1, .yt-page-header-view-model__page-header-title')?.textContent?.trim() || displayName;
    if (platform === 'tiktok') displayName = container.querySelector('[data-e2e="user-subtitle"], [data-e2e="user-title"]')?.textContent?.trim() || displayName;
    if (platform === 'x') displayName = Array.from(container.querySelectorAll('span')).find(s => s.textContent.trim() && !s.textContent.trim().startsWith('@'))?.textContent?.trim() || displayName;
    const bio = container.querySelector('[data-testid="UserDescription"], [data-e2e="user-bio"]')?.textContent || '';
    return { ...identity, displayName: displayName.slice(0, 160), bio: bio.slice(0, 2000) };
  }
  function closePanel() { sequence++; panel?.remove(); panel = null; }
  function newPanel() {
    panel?.remove();
    const host = el('div'); host.dataset.expertsealPanel = 'true';
    host.style.cssText = 'position:fixed!important;right:18px!important;bottom:18px!important;width:min(420px,calc(100vw - 36px))!important;max-height:85vh!important;z-index:2147483647!important;';
    const root = host.attachShadow({ mode: 'closed' });
    const style = el('style'); style.textContent = ':host{all:initial}*{box-sizing:border-box}.shell{position:relative;max-height:85vh;overflow:auto;border-radius:18px;box-shadow:0 18px 70px #0008;background:#101923;color:#e9eef3;font:14px/1.6 system-ui}.close{position:sticky;top:8px;float:right;z-index:1;margin:8px 8px -42px 0;width:30px;height:30px;border:1px solid #4a5c69;border-radius:50%;background:#182736;color:white;cursor:pointer}.state{padding:28px}.state h2{font-size:18px}.state button{padding:9px 14px;margin:8px 8px 0 0;border:1px solid #69ddbf;border-radius:8px;background:#183c34;color:#baf9e7;cursor:pointer}';
    const shell = el('section', '', 'shell'); shell.setAttribute('role', 'dialog'); shell.setAttribute('aria-label', 'ExpertSeal credential research');
    const close = el('button', '×', 'close'); close.type = 'button'; close.setAttribute('aria-label', 'Close research report'); close.addEventListener('click', closePanel);
    const body = el('div'); body.setAttribute('aria-live', 'polite'); shell.append(close, body); root.append(style, shell);
    document.documentElement.append(host); panel = host; close.focus(); return body;
  }
  async function check(creator, refresh = false) {
    const requestId = ++sequence;
    const body = newPanel();
    const state = el('div', '', 'state'); state.append(el('h2', 'Researching credentials…'), el('p', creator.displayName || creator.username), el('p', 'Searching public sources. This can take up to a minute.')); body.append(state);
    try {
      const response = await chrome.runtime.sendMessage({ action: 'verify', creator, refresh });
      if (requestId !== sequence || !panel) return;
      if (!response?.success) throw new Error(response?.error || 'No response. Refresh this tab and try again.');
      render(body, response);
      const again = el('button', 'Refresh research'); again.style.cssText = 'margin:0 22px 20px;padding:10px;border:1px solid #69ddbf;border-radius:8px;background:#183c34;color:#baf9e7;cursor:pointer';
      again.addEventListener('click', () => check(creator, true)); body.append(again);
    } catch (error) {
      if (requestId !== sequence || !panel) return;
      state.replaceChildren(el('h2', 'Could not complete research'), el('p', error.message));
      const settings = el('button', 'Open settings'); settings.addEventListener('click', async () => {
        try { await chrome.runtime.sendMessage({ action: 'openSettings' }); }
        catch { state.append(el('p', 'Open ExpertSeal from the browser Extensions menu.')); }
      });
      const retry = el('button', 'Try again'); retry.addEventListener('click', () => check(creator)); state.append(settings, retry);
    }
  }
  function attach(container, getCreator) {
    if (!container || buttons.get(container)?.isConnected || !getCreator()) return;
    const host = el('span'); host.dataset.expertsealBadge = 'true'; host.style.cssText = 'display:inline-flex!important;margin:6px 8px!important;vertical-align:middle!important;';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = el('style'); style.textContent = ':host{all:initial}button{font:600 12px/1.4 system-ui,sans-serif;border:1px solid #4cb99a;border-radius:20px;padding:6px 11px;background:#102e26;color:#baf9e7;cursor:pointer;white-space:nowrap}button:hover{background:#205440}button:focus-visible{outline:2px solid #fff;outline-offset:3px}';
    const button = el('button', '🛡 Check credentials'); button.type = 'button'; button.title = 'Research this creator with your selected AI provider';
    button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); const creator = getCreator(); if (creator) check(creator); });
    shadow.append(style, button); container.append(host); buttons.set(container, host);
  }
  function scan() {
    if (route !== location.href) { route = location.href; closePanel(); }
    if (platform === 'youtube') {
      document.querySelectorAll('ytd-video-owner-renderer').forEach(owner => attach(owner, () => creatorIn(owner)));
      const identity = profile(location.href);
      if (identity) {
        const header = document.querySelector('ytd-page-header-renderer, yt-page-header-renderer, #channel-header-container, ytd-c4-tabbed-header-renderer');
        if (header) attach(header, () => {
          // Channel headers may contain other channel links: the route is authoritative.
          const current = profile(location.href); if (!current) return null;
          return { ...current, displayName: header.querySelector('h1, #channel-name, .yt-page-header-view-model__page-header-title')?.textContent?.trim() || current.username };
        });
      }
    } else if (platform === 'x') {
      document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
        const name = article.querySelector('[data-testid="User-Name"]'); if (name) attach(name, () => creatorIn(name));
      });
      const name = document.querySelector('[data-testid="UserName"]');
      if (name && profile(location.href)) attach(name, () => ({ ...profile(location.href), displayName: name.querySelector('span')?.textContent || '', bio: document.querySelector('[data-testid="UserDescription"]')?.textContent || '' }));
    } else if (platform === 'tiktok') {
      const name = document.querySelector('[data-e2e="user-title"]');
      if (name && profile(location.href)) attach(name.parentElement, () => ({ ...profile(location.href), displayName: document.querySelector('[data-e2e="user-subtitle"]')?.textContent || name.textContent, bio: document.querySelector('[data-e2e="user-bio"]')?.textContent || '' }));
      document.querySelectorAll('[data-e2e="video-author-container"], [data-e2e="feed-item"]').forEach(item => attach(item, () => creatorIn(item)));
    }
  }
  function schedule() { if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 300); }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  window.addEventListener('yt-navigate-finish', schedule);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanel(); });
  scan();
})();
