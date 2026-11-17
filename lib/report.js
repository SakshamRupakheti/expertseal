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
  function exportText(result) {
    const plain=value=>String(value || '').replace(/[\r\n]+/g,' ').replace(/[<>]/g,'');
    const data=result.data, creator=result.creator;
    if(data.mode==='expertise') return [
      `ExpertSeal: ${plain(data.name || creator.username)}`,`Profile: ${safeUrl(creator.profileUrl)}`,`Subject: ${plain(data.topic.subject) || 'Not selected'}`,
      `Checked: ${new Date(result.timestamp).toISOString()}`,`Identity: ${plain(data.identity.state)}`,
      ...data.statements.flatMap(s=>[plain(s.text),...s.urls.map(safeUrl)]),
      ...data.credentials.filter(c=>['institutionally_supported','self_reported','source_supported'].includes(c.status)).flatMap(c=>[`${plain(c.type)}: ${plain(c.title)}; ${plain(c.institution)}; ${plain(c.status)}`,safeUrl(c.url)]),
      ...data.limitations.map(plain)
    ].join('\n');
    const lines=[`ExpertSeal: ${plain(data.name || creator.username)}`,`Profile: ${safeUrl(creator.profileUrl)}`,
      `Provider: ${plain(result.provider)}`,`Checked: ${new Date(result.timestamp).toISOString()}`,
      'Status: Research leads, not independent credential certification.', '', plain(data.summary)];
    if(creator.context)lines.push(`User-provided context: ${plain(creator.context)}`);
    if(creator.linkedinUrl)lines.push(`User-provided LinkedIn (connection unverified): ${safeUrl(creator.linkedinUrl)}`);
    for(const section of data.sections || [{title:'Sources',sources:data.sources || [],candidates:[]}]) {
      lines.push('',plain(section.title));
      if(section.error)lines.push(plain(section.error));
      if(!section.sources.length)lines.push('No matching evidence found in this search.');
      for(const source of section.sources)lines.push(`- ${plain(source.title)} (${plain(source.label)})`,safeUrl(source.url),plain(source.match),plain(source.excerpt));
      if(section.candidates?.length)lines.push(`${section.candidates.length} unmatched results excluded from this export; they may refer to other people.`);
    }
    lines.push('',...(data.limitations || []).map(plain),'','Search snippets may be incomplete or outdated. Confirm identity and claims on original sources.');
    return lines.join('\n');
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
  function renderExpertise(card,result) {
    const d=result.data;
    card.append(el('div','EXPERTSEAL / EVIDENCE','eyebrow'),el('h2',d.name || result.creator.username),link(result.creator.username,result.creator.profileUrl));
    const brief=el('section');brief.setAttribute('aria-label','Expertise summary');
    for(const s of d.statements) {const row=el('p',s.text);s.urls.forEach((url,i)=>{row.append(document.createTextNode(' '),link(`Source ${i+1}`,url));});brief.append(row);}
    card.append(brief);
    card.append(el('p',d.summaryMode==='ollama_validated' ? 'Local model output checked against evidence.' : 'Limited mode: deterministic evidence summary.','muted'));
    const evidence=el('details');evidence.append(el('summary',`View evidence (${d.sources.length} records)`));
    evidence.append(el('h3','Identity links'),el('p',d.identity.explanation));
    for(const e of d.identity.evidence) evidence.append(link('Record linking this exact account',e.sourceUrl),el('p',`${e.sourceType} · ${e.recordPath}`,'muted'));
    evidence.append(el('h3','Qualifications and authored work'));
    const labels={institutionally_supported:'Institutional record',source_supported:'Original work record',self_reported:'Self-reported',unverified_lead:'Candidate only, not attributed',conflicting:'Conflicting evidence, not attributed'};
    for(const c of d.credentials) {
      const item=el('section','','evidence');item.append(el('p',labels[c.status] || 'Unverified lead','muted'),el('p',c.title),el('p',c.institution),link('Original record',c.url));
      if(c.start || c.end) item.append(el('p',`${c.start || 'Unknown start'} to ${c.end || 'Unknown end'}`,'muted'));
      if(c.field)item.append(el('p',`Field: ${c.field}`,'muted'));evidence.append(item);
    }
    if(!d.credentials.length) evidence.append(el('p','No supported structured qualifications found.'));
    evidence.append(el('h3','Subject'),el('p',d.topic.subject || 'Not selected'));
    if(d.topic.hint) evidence.append(el('p',`Context hint only: ${d.topic.hint}`,'muted'));
    const leads=el('details');leads.append(el('summary',`${d.leads.length} discovery leads, identity unconfirmed`));
    for(const lead of d.leads) leads.append(link(lead.title || 'Search lead',lead.url),el('p',lead.excerpt,'muted'));evidence.append(leads);
    evidence.append(el('h3','Limits'));for(const limit of d.limitations)evidence.append(el('p',limit,'muted'));
    const download=el('button','Download report (.txt)');download.type='button';download.addEventListener('click',()=>{
      const url=URL.createObjectURL(new Blob([exportText(result)],{type:'text/plain;charset=utf-8'}));const a=el('a');a.href=url;a.download='expertseal-evidence.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });evidence.append(download);card.append(evidence);
    card.append(el('p',`${result.cached ? 'Cached' : 'Fresh'} · ${new Date(result.timestamp).toLocaleString()}`,'muted note'));
  }
  function render(container, result) {
    container.replaceChildren();
    const style = el('style'); style.textContent = CSS; container.append(style);
    const card = el('article', '', 'report'); container.append(card);
    const data = result.data;
    if(data.mode==='expertise') {renderExpertise(card,result);return;}
    const sourceMode = ['sources','dossier'].includes(data.mode);
    card.append(el('div', data.mode === 'dossier' ? 'EXPERTSEAL / CREATOR BACKGROUND' : sourceMode ? 'EXPERTSEAL / SOURCE SEARCH' : 'EXPERTSEAL / AI RESEARCH', 'eyebrow'));
    card.append(el('h2', data.name || result.creator.displayName || result.creator.username));
    card.append(link(result.creator.username, result.creator.profileUrl));
    if (result.creator.context || result.creator.linkedinUrl) {
      const hints=el('details');hints.append(el('summary','Identity hints supplied by you · unverified'));
      if(result.creator.context)hints.append(el('p',result.creator.context));
      if(result.creator.linkedinUrl)hints.append(link('Suggested LinkedIn profile ↗',result.creator.linkedinUrl));card.append(hints);
    }
    const status = el('p'); status.append(el('span', sourceMode ? 'Not verified · review sources' : data.status === 'evidence_found' ? 'Credential evidence found' : 'Inconclusive', `pill ${!sourceMode && data.status === 'evidence_found' ? 'found' : ''}`)); card.append(status);
    if (data.field) card.append(el('p', data.field, 'muted'));
    card.append(el('p', data.summary));
    if (data.mode === 'dossier') {
      card.append(el('p', 'Checking the channel or profile shown above. Search-box text, guests and recommended creators are excluded.', 'identity'));
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
    const download=el('button','Download report (.txt)');download.type='button';download.style.cssText='border:1px solid #4a5c69;border-radius:8px;padding:10px;background:#182736;color:#e9eef3;cursor:pointer';
    download.addEventListener('click',()=>{
      const url=URL.createObjectURL(new Blob([exportText(result)],{type:'text/plain;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download='expertseal-report.txt';card.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });card.append(download);
  }
  globalThis.ExpertSealReport = Object.freeze({ render, el, link, exportText });
})();
