(() => {
  const { safeUrl } = globalThis.ExpertSealIdentity;
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(title, url) {
    const href = safeUrl(url);
    if (!href) return el('span', title);
    const a = el('a', title); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }
  const CSS = `
    :host{all:initial;color-scheme:dark}*{box-sizing:border-box}
    .report{font:14px/1.6 system-ui,sans-serif;color:#e9eef3;background:#101923;border:1px solid #314454;border-radius:18px;padding:22px;text-align:left;overflow-wrap:anywhere}
    h2{font-size:20px;line-height:1.3;margin:12px 0 4px}h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9fb5c5;margin:20px 0 8px}p{margin:8px 0}
    .eyebrow{color:#69ddbf;font-size:11px;letter-spacing:.14em;font-weight:700}.pill{display:inline-block;border-radius:30px;padding:5px 10px;background:#493a1b;color:#ffe2a2;font-size:12px;font-weight:650}.found{background:#143e35;color:#91f1cc}
    a{color:#8bd9ff;text-decoration:underline;text-underline-offset:3px}a:hover{color:#fff}li{margin:8px 0}ul,ol{padding-left:21px}.muted{font-size:12px;color:#a8bac8}.note{border-top:1px solid #30404d;margin-top:18px;padding-top:12px}.source-list a{display:inline-block}.credential-title{font-weight:650}.credential-meta{color:#a8bac8;font-size:12px}
    iframe{width:100%;height:160px;border:0;border-radius:8px;background:white;margin-top:12px}.search-label{margin-top:20px}
    .section{border-top:1px solid #30404d;margin-top:18px;padding-top:4px}.evidence{background:#172530;border-radius:10px;padding:12px;margin:10px 0}.evidence p{margin:6px 0}.empty{color:#a8bac8;font-size:13px}summary{cursor:pointer;color:#8bd9ff;font-size:12px;padding:10px 0}.section h3{font-size:14px;text-transform:none;letter-spacing:0;color:#e9eef3}.identity{padding:10px;background:#203128;border-radius:8px;color:#b7d8c3;font-size:12px}
  `;
  function render(container, result) {
    container.replaceChildren();
    const style = el('style'); style.textContent = CSS; container.append(style);
    const card = el('article', '', 'report'); container.append(card);
    const data = result.data;
    const sourceMode = ['sources','dossier'].includes(data.mode);
    card.append(el('div', data.mode === 'dossier' ? 'EXPERTSEAL / CREATOR BACKGROUND' : sourceMode ? 'EXPERTSEAL / SOURCE SEARCH' : 'EXPERTSEAL / AI RESEARCH', 'eyebrow'));
    card.append(el('h2', data.name || result.creator.displayName || result.creator.username));
    card.append(link(result.creator.username, result.creator.profileUrl));
    const status = el('p'); status.append(el('span', sourceMode ? 'Not verified · review sources' : data.status === 'evidence_found' ? 'Credential evidence found' : 'Inconclusive', `pill ${!sourceMode && data.status === 'evidence_found' ? 'found' : ''}`)); card.append(status);
    if (data.field) card.append(el('p', data.field, 'muted'));
    card.append(el('p', data.summary));
    if (data.mode === 'dossier') {
      card.append(el('p', 'Checking the channel/profile above — not the search-box text, video guest or recommended creator.', 'identity'));
      function evidenceCard(source) {
        const item = el('div','','evidence');
        item.append(link(source.title,source.url),el('p',source.label,'muted'),el('p',source.match,'muted'));
        if (source.excerpt) { const more=el('details');more.append(el('summary','Read search excerpt'),el('p',source.excerpt));item.append(more); }
        return item;
      }
      for (const section of data.sections || []) {
        const block=el('section','','section');block.append(el('h3',section.title));
        block.append(el('p', section.error ? section.error : section.sources.length ? 'Possible sources · not confirmed facts' : 'No matching evidence found in this search.', 'empty'));
        for (const source of section.sources) block.append(evidenceCard(source));
        if (section.candidates.length) {
          const other=el('details');other.append(el('summary',`${section.candidates.length} unmatched results · may be other people`));
          for (const source of section.candidates) other.append(evidenceCard(source));block.append(other);
        }
        card.append(block);
      }
      card.append(el('p','Up to 4 basic search credits per fresh report. Cached reports make no search requests.','muted'));
    }
    if (data.credentials.length) {
      card.append(el('h3', 'Reported credentials'));
      const ul = el('ul');
      for (const c of data.credentials) { const li = el('li'); li.append(el('div', c.title, 'credential-title'), el('div', c.institution, 'credential-meta'), link('Open cited record ↗', c.url)); ul.append(li); }
      card.append(ul);
    }
    if (data.sources.length) {
      card.append(el('h3', 'Live-search sources'));
      const ol = el('ol', '', 'source-list');
      for (const source of data.sources) { const li = el('li'); li.append(link(source.title, source.url)); if (sourceMode && source.excerpt) li.append(el('p', source.excerpt, 'muted')); ol.append(li); }
      card.append(ol);
    }
    if (data.limitations.length) {
      card.append(el('h3', 'What remains uncertain'));
      const ul = el('ul'); for (const note of data.limitations) ul.append(el('li', note)); card.append(ul);
    }
    // Provider search suggestions retain their HTML/CSS in a scriptless, opaque-origin frame.
    // A restrictive CSP prevents forms, scripts, remote images, or page access.
    if (data.searchSuggestions) {
      card.append(el('h3', 'Google Search suggestions', 'search-label'));
      const frame = el('iframe'); frame.title = 'Google Search suggestions';
      frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      frame.srcdoc = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; base-uri \'none\'; form-action \'none\'"><base target="_blank">' + data.searchSuggestions;
      card.append(frame);
    }
    card.append(el('p', `${result.provider} · ${result.cached ? 'Cached' : 'Fresh'} · ${new Date(result.timestamp).toLocaleString()}`, 'muted note'));
    card.append(el('p', sourceMode ? 'Search results are leads, not proof. Open the sources and confirm the identity yourself. This is not professional certification.' : 'AI research can be wrong. Open the sources and confirm the identity yourself. This is not a professional certification or a fact-check of individual posts.', 'muted'));
  }
  globalThis.ExpertSealReport = Object.freeze({ render, el, link });
})();
