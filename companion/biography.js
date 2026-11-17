import {load} from 'cheerio';
import {createHash} from 'node:crypto';

// Keep complete sentences and their surrounding paragraph. Never match a fragment
// inside a negation, quotation, instruction, or statement about another person.
const normalized = text => text.replace(/\s+/gu,' ').trim();
const unsafe = /\b(ignore|instructions?|prompt|system|assistant|pretend|fictional|hypothetical|example|suppose|wish|want|hope|never|not|didn't|didn’t|would|could|might|reportedly|allegedly|claims? that)\b|[“”"]|https?:|\S+@\S+/iu;
const patterns = [
  ['education', /^(?:studied|graduated)\b.*\b(?:university|college|school|medicine|engineering)\b|^(?:earned|completed|received) (?:a |an |my |the )?(?:degree|diploma|bachelor|master|phd|ph\.d)\b/iu],
  ['experience', /^(?:worked|work|joined|founded|co-founded|served)\b|^spent\b.{0,100}\bworking\b/iu],
  ['publication', /^(?:published|authored|wrote)\b.{0,100}\b(?:book|paper|article|software)\b/iu]
];
export function biographyPassages(html) {
  const $=load(html);
  $('script,style,nav,header,footer,aside,form,button,blockquote,q,template,[hidden],[aria-hidden="true"],[itemprop="review"],[class*="testimonial"],[class*="comment"]').remove();
  const main=$('main,[role="main"]').first();
  if(!main.length) return []; // No whole-page fallback: navigation and testimonials are not biographies.
  const passages=[];
  main.find('p,li').slice(0,300).each((index,node)=>{
    if($(node).find('p,li').length) return;
    const paragraph=normalized($(node).text());
    if(paragraph.length<20 || paragraph.length>1000 || unsafe.test(paragraph)) return;
    const sentences=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(paragraph)].map(s=>s.segment.trim());
    for(const quote of sentences) if(quote.length>=20 && quote.length<=380 && passages.length<32) {
      passages.push({quote,paragraph,path:`main paragraph[${index}]`});
    }
  });
  return passages;
}
export function biographyCandidates(sources,identity) {
  if(identity.state!=='matched') return [];
  const out=[],seen=new Set();
  for(const source of sources) {
    // Multiple Person records make first-person and name-scoped prose ambiguous.
    if(source.people?.length!==1) continue;
    const person=source.people[0];
    if(!identity.recordIds.includes(person.id) || !person.name) continue;
    const aboutPage=/\/(?:about(?:-me)?|bio(?:graphy)?)(?:\/|$)/i.test(new URL(source.url).pathname);
    for(const passage of source.passages || []) {
      if(unsafe.test(passage.paragraph) || !passage.paragraph.includes(passage.quote)) continue;
      let sentence=passage.quote.replace(/^(?:In \d{4},? |After graduating(?: [\p{L} ]{1,30})?, )/u,'');
      let predicate='';
      if(source.sourceType==='self_reported' && aboutPage && /^I (?:then )?/u.test(sentence)) predicate=sentence.replace(/^I (?:then )?/u,'');
      else if(sentence.startsWith(person.name+' ')) predicate=sentence.slice(person.name.length+1);
      if(!predicate) continue;
      const type=patterns.find(([,pattern])=>pattern.test(predicate))?.[0];
      if(!type) continue;
      const dedupe=type+'|'+passage.quote;
      if(seen.has(dedupe)) continue;seen.add(dedupe);
      out.push({id:'bio-'+createHash('sha256').update(source.url+'|'+dedupe).digest('hex').slice(0,16),type,
        title:({education:'Study history',experience:'Work history',publication:'Authored work'})[type],
        institution:'',field:'',start:'',end:'',url:source.url,sourceType:source.sourceType,
        recordId:person.id,recordPath:passage.path,identityEvidence:identity.evidence.filter(e=>e.recordId===person.id),
        status:source.sourceType==='institutional' ? 'institutionally_supported' : 'self_reported',
        evidenceKind:'biography_quote',quote:passage.quote});
      if(out.length===8) return out;
    }
  }
  return out;
}
// The model proposes IDs, not facts. Resolve them exclusively against fetched,
// subject-scoped passages; invented IDs, fields, duplicates and oversized output fail closed.
export function selectBiography(raw,candidates) {
  if(!raw || Object.keys(raw).join(',')!=='claimIds' || !Array.isArray(raw.claimIds) || raw.claimIds.length>6 || new Set(raw.claimIds).size!==raw.claimIds.length) throw new Error('Invalid biography selection.');
  return raw.claimIds.map(id=>{
    const claim=candidates.find(c=>c.id===id);
    if(!claim) throw new Error('Unsupported biography claim.');
    return claim;
  });
}
