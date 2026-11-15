/* Shared by the content script, service worker and tests. No network access. */
(() => {
  function safeUrl(value) {
    try {
      const url = new URL(value);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
      return url.href;
    } catch { return ''; }
  }
  function parseProfileUrl(value) {
    const clean = safeUrl(value);
    if (!clean) throw new Error('Enter a full YouTube, TikTok or X creator URL.');
    const url = new URL(clean);
    const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    let platform, username, profileUrl;
    if (host === 'youtube.com') {
      platform = 'youtube';
      if (/^@[^\s/?#]+$/u.test(parts[0] || '')) {
        username = parts[0]; profileUrl = `https://www.youtube.com/${username}`;
      } else if (['channel', 'c', 'user'].includes(parts[0]) && /^[\w.-]+$/.test(parts[1] || '')) {
        username = `${parts[0]}/${parts[1]}`; profileUrl = `https://www.youtube.com/${username}`;
      }
    } else if (host === 'tiktok.com' && /^@[\w.-]+$/.test(parts[0] || '')) {
      platform = 'tiktok'; username = parts[0]; profileUrl = `https://www.tiktok.com/${username}`;
    } else if (['x.com', 'twitter.com'].includes(host) && /^[A-Za-z0-9_]{1,15}$/.test(parts[0] || '') &&
      !['home', 'explore', 'search', 'settings', 'messages', 'notifications', 'i', 'intent', 'compose', 'login', 'signup'].includes(parts[0].toLowerCase())) {
      platform = 'x'; username = `@${parts[0]}`; profileUrl = `https://x.com/${parts[0]}`;
    }
    if (!profileUrl) throw new Error('Use a creator profile URL. For a YouTube video, use the badge beside its creator.');
    return { platform, username, profileUrl };
  }
  function normalizeCreator(input) {
    if (!input || typeof input !== 'object') throw new Error('Creator information is missing.');
    return { ...parseProfileUrl(input.profileUrl), displayName: String(input.displayName || '').slice(0, 160), bio: String(input.bio || '').slice(0, 2000) };
  }
  function platformForHost(host) {
    host = host.toLowerCase().replace(/^(www|m|mobile)\./, '');
    return ({ 'youtube.com': 'youtube', 'tiktok.com': 'tiktok', 'x.com': 'x', 'twitter.com': 'x' })[host] || '';
  }
  globalThis.ExpertSealIdentity = Object.freeze({ safeUrl, parseProfileUrl, normalizeCreator, platformForHost });
})();
