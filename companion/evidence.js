import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import '../lib/identity.js';
const { parseProfileUrl } = globalThis.ExpertSealIdentity;
export const clean = (v, max = 160) => typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max) : '';
const array = v => (Array.isArray(v) ? v : v == null ? [] : [v]).slice(0,30);
const name = v => clean(typeof v === 'string' ? v : v?.name);
const id = value => createHash('sha256').update(value).digest('hex').slice(0,20);
const normalized = v => clean(v).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const date = v => typeof v === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v) ? v : '';
export function exactAccount(value, target) {
  try {
    const url = new URL(value);
    if (url.search || url.hash || url.port || url.username || url.password) return false;
    const a = parseProfileUrl(value), b = parseProfileUrl(target);
    // Do not canonicalize /status, /video or channel subpages into account evidence.
    if (url.pathname.replace(/\/$/,'') !== new URL(a.profileUrl).pathname) return false;
    return a.profileUrl.includes('/channel/') ? a.profileUrl === b.profileUrl : a.profileUrl.toLowerCase() === b.profileUrl.toLowerCase();
  } catch { return false; }
}
export function parseSource({url,html,sourceType,retrievedAt}) {
  const $ = load(html); const people = [], works=[];
  const identifier = value => {try {return new URL(value,url).href;} catch {return '';}};
  function visit(node, depth=0) {
    if (depth > 5 || !node || typeof node !== 'object' || people.length >= 12) return;
    if (Array.isArray(node)) { node.slice(0,30).forEach(n=>visit(n,depth+1)); return; }
    if (array(node['@type']).includes('Person')) {
      const links = array(node.sameAs).filter(v=>typeof v==='string' && /^https:\/\//.test(v)).slice(0,15);
      const facts = [];
      const add = (type,title,institution,field='',start='',end='') => {
        if (!title || title.length>160) return;
        facts.push({type,title:clean(title),institution:name(institution),field:clean(field),start:date(start),end:date(end)});
      };
      for (const school of array(node.alumniOf)) if (name(school)) add('education','Education affiliation',school);
      for (const credential of array(node.hasCredential)) if (name(credential)) add('education',name(credential),credential?.recognizedBy, name(credential?.competencyRequired));
      for (const employer of array(node.worksFor)) if (name(employer)) add('experience',name(node.jobTitle) || 'Employment affiliation',employer,name(node.jobTitle));
      for (const role of array(node.hasOccupation)) if (name(role)) add('experience',name(role),role?.occupationLocation,name(role?.occupationalCategory),role?.startDate,role?.endDate);
      people.push({id:id(url+'|'+people.length),nodeId:typeof node['@id']==='string' ? identifier(node['@id']) : '',name:name(node.name),links,facts:facts.slice(0,20),sourceUrl:url,sourceType,
        recordType:'schema.org/Person',path:`Person[${people.length}]`});
    }
    if(array(node['@type']).some(type=>['Article','ScholarlyArticle','SoftwareSourceCode','Book','CreativeWork'].includes(type))) {
      works.push(node);for(const author of array(node.author)) if(typeof author==='object') visit(author,depth+1);
    }
    if (node['@graph']) visit(node['@graph'],depth+1);
    if (node.mainEntity) visit(node.mainEntity,depth+1);
  }
  $('script[type="application/ld+json"]').slice(0,12).each((_,node)=>{try {visit(JSON.parse($(node).text()));} catch {/* Invalid structured data stays unverified. */}});
  for(const work of works.slice(0,12)) for(const person of people) {
    const authored=person.nodeId && array(work.author).some(a=>typeof a?.['@id']==='string' && identifier(a['@id'])===person.nodeId);
    if(authored && name(work) && person.facts.length<20) person.facts.push({type:array(work['@type']).includes('SoftwareSourceCode') ? 'experience' : 'publication',originalWork:true,title:name(work),institution:name(work.publisher),field:name(work.about) || name(work.programmingLanguage),start:date(work.datePublished),end:''});
  }
  return {url,title:clean($('title').text()) || new URL(url).hostname,sourceType,retrievedAt,people};
}
export function resolveIdentity(creator, sources, leads=[]) {
  const matches = sources.flatMap(s=>s.people || []).filter(p=>p.links.some(link=>exactAccount(link,creator.profileUrl)));
  const names = new Set(matches.map(p=>normalized(p.name)).filter(Boolean));
  const state = names.size > 1 ? 'conflicting_evidence' : matches.length ? 'matched' : leads.length || sources.length ? 'possible_match' : 'unresolved';
  return {state,recordIds:state==='matched' ? matches.map(p=>p.id) : [],evidence:matches.map(p=>({sourceUrl:p.sourceUrl,recordId:p.id,
    relation:'record_links_exact_account',account:creator.profileUrl,recordPath:p.path,sourceType:p.sourceType})),
    explanation:state==='matched' ? 'A public professional record explicitly links this account.' : state==='conflicting_evidence' ? 'Directly linked records contain conflicting names. Attribution withheld.' : 'No direct account link established. Name matches are candidates only.'};
}
export function extractCredentials(sources, identity) {
  const candidates = sources.flatMap(s=>(s.people || []).flatMap(p=>p.facts.map((fact,i)=>({
    ...fact,id:id(p.id+'|'+i),url:s.url,sourceType:s.sourceType,recordId:p.id,recordPath:`${p.path}.facts[${i}]`,
    identityEvidence:identity.evidence.filter(e=>e.recordId===p.id),
    status:identity.state==='conflicting_evidence' ? 'conflicting' : identity.recordIds.includes(p.id) ?
      s.sourceType==='institutional' ? 'institutionally_supported' : s.sourceType==='original_work' && fact.originalWork ? 'source_supported' : 'self_reported' : 'unverified_lead'
  }))));
  for (const fact of candidates) {
    const contradicts = candidates.some(other => other.id!==fact.id && other.status!=='unverified_lead' && fact.status!=='unverified_lead' &&
      normalized(other.institution)===normalized(fact.institution) && normalized(other.title)===normalized(fact.title) &&
      other.start && other.start===fact.start && other.end && fact.end && other.end!==fact.end);
    if (contradicts || (fact.start && fact.end && fact.end<fact.start)) fact.status='conflicting';
  }
  return candidates.slice(0,80);
}
export function topicRelevance(subject, credentials) {
  const target = normalized(subject);
  if (!target || target.length<3) return {state:'insufficient_evidence',credentialIds:[],explanation:'Choose a subject to assess topic fit.'};
  // Exact field phrase overlap only. No ranking, degree prestige or LLM identity judgment.
  const relevant = credentials.filter(c=>['institutionally_supported','source_supported'].includes(c.status) &&
    (' '+normalized(c.field+' '+c.title)+' ').includes(' '+target+' '));
  return {state:relevant.length ? 'documented_overlap' : 'insufficient_evidence',credentialIds:relevant.map(c=>c.id),
    explanation:relevant.length ? 'Documented field overlaps the selected subject.' : 'No documented topic overlap established.'};
}
export function summaryOptions(identity, credentials, topic) {
  const options=[];
  const push=(key,text,urls=[])=>options.push({id:key,text,urls:[...new Set(urls)]});
  push('identity',identity.state==='matched' ? 'Identity: Professional record links this account.' :
    identity.state==='conflicting_evidence' ? 'Identity: Conflicting records; attribution withheld.' : 'Identity: Unresolved. Candidate qualifications are not attributed.',identity.evidence.map(e=>e.sourceUrl));
  for (const [kind,label] of [['education','Education'],['experience','Experience']]) {
    const supported=credentials.find(c=>c.type===kind && ['institutionally_supported','source_supported'].includes(c.status));
    const self=credentials.find(c=>c.type===kind && c.status==='self_reported');
    const c=supported || self;
    push(kind,c ? `${label}: ${c.title.slice(0,65)}${c.institution ? ', '+c.institution.slice(0,45) : ''}. ${supported ? c.status==='source_supported' ? 'Original work.' : 'Institutional record.' : 'Self-reported.'}` : `${label}: Not independently confirmed.`,c ? [c.url] : []);
  }
  push('topic','Topic fit: '+topic.explanation,credentials.filter(c=>topic.credentialIds.includes(c.id)).map(c=>c.url));
  return options;
}
// Model may select/order existing statements, but cannot rewrite them or create facts/URLs.
export function validateSelection(raw,options) {
  if(!raw || Object.keys(raw).join(',')!=='statementIds' || !Array.isArray(raw.statementIds)) throw new Error('Invalid selection.');
  return validateSummary({statements:raw.statementIds.map(id=>options.find(o=>o.id===id) || {})},options);
}
export function validateSummary(raw, options) {
  if (!raw || !Array.isArray(raw.statements) || raw.statements.length!==4) throw new Error('Invalid summary shape.');
  const ids=new Set();
  const out=raw.statements.map(s=>{
    const canonical=options.find(o=>o.id===s.id);
    if (!canonical || ids.has(s.id) || s.text!==canonical.text || JSON.stringify(s.urls)!==JSON.stringify(canonical.urls)) throw new Error('Unsupported model statement.');
    ids.add(s.id); return canonical;
  });
  if (out[0].id!=='identity' || out.some(s=>s.text.length>180)) throw new Error('Summary must be concise and lead with identity.');
  return out;
}
