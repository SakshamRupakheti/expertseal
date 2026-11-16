import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/identity.js';
import { extractJson, normalizeReport, requestFor, research, decodeResponse, buildDossier } from '../lib/verification.js';
const { parseProfileUrl, safeUrl, normalizeCreator } = globalThis.ExpertSealIdentity;
test('Tavily makes four focused searches and never verifies credentials', async () => {
  let calls = 0;
  const report = await research('tavily', 'unit-test-key', {displayName:'Ada',profileUrl:'https://x.com/ada',bio:'private fixture not sent'}, async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.tavily.com/search');
    assert.equal(init.headers.Authorization, 'Bearer unit-test-key');
    const body = JSON.parse(init.body);
    assert.equal(body.search_depth, 'basic'); assert.equal(body.auto_parameters, false);
    assert.equal(body.include_answer, false); assert.equal(body.max_results, 5);
    assert.ok(!init.body.includes('private fixture'));
    return {ok:true,json:async()=>({answer:'Verified professor!',results:[null,
      {title:'Unsafe',url:'javascript:alert(1)'},
      {title:'Faculty',url:'https://example.edu/ada',content:'<script>bad()</script>'},
      {title:'Duplicate',url:'https://example.edu/ada'}]})};
  });
  assert.equal(calls, 4); assert.equal(report.mode, 'dossier'); assert.equal(report.status, 'inconclusive');
  assert.equal(report.identityMatched, false); assert.deepEqual(report.credentials, []);
  assert.equal(report.sections.length, 4); assert.equal(report.sections[0].candidates.length, 1); assert.equal(report.sections[0].candidates[0].excerpt, 'bad()');
  assert.ok(!report.summary.includes('professor'));
});
test('Tavily handles empty results, malformed payloads and quota without fallback', async () => {
  assert.equal((await research('tavily','unit-test-key',{},async()=>({ok:true,json:async()=>({results:[]})}))).sources.length,0);
  await assert.rejects(research('tavily','unit-test-key',{},async()=>({ok:true,json:async()=>({})})), /unreadable/);
  for (const status of [432,433]) {
    let calls=0;
    await assert.rejects(research('tavily','unit-test-key',{},async()=>{calls++;return {ok:false,status};}), /quota/);
    assert.equal(calls,4);
  }
});
test('canonical creator URLs discard tracking and keep stable identities', () => {
  assert.equal(parseProfileUrl('https://www.youtube.com/@Ada/videos?utm_source=test').profileUrl, 'https://www.youtube.com/@Ada');
  assert.equal(parseProfileUrl('https://youtube.com/channel/UCabcXYZ').username, 'channel/UCabcXYZ');
  assert.equal(parseProfileUrl('https://twitter.com/ada/status/123').profileUrl, 'https://x.com/ada');
  assert.equal(parseProfileUrl('https://www.tiktok.com/@ada/video/123').username, '@ada');
});
test('rejects impostor hosts, script URLs, credentials, and non-creator routes', () => {
  for (const url of ['https://youtube.com.evil.test/@ada', 'javascript:alert(1)', 'https://secret@youtube.com/@ada', 'https://x.com/home', 'https://youtube.com/watch?v=abc']) assert.throws(() => parseProfileUrl(url));
  assert.equal(safeUrl('data:text/html,hello'), '');
  assert.equal(safeUrl('https://university.edu/person'), 'https://university.edu/person');
  assert.equal(normalizeCreator({profileUrl:'https://x.com/ada', bio:'a'.repeat(3000)}).bio.length,2000);
});
test('parses fenced reports and rejects non-object or malformed data', () => {
  assert.deepEqual(extractJson('```json\n{"status":"inconclusive"}\n```'),{status:'inconclusive'});
  for (const value of ['[]','null','invalid','']) assert.throws(() => extractJson(value));
});
const raw = { status:'evidence_found', identityMatched:true, name:'Ada', credentials:[{title:'Professor',url:'https://example.edu/ada'}], summary:'Institutional profile found.' };
const evidence = { searched:true, sources:[{title:'Faculty',uri:'https://example.edu/ada'}] };
test('positive assessment requires live sources, credentials and exact identity flag', () => {
  assert.equal(normalizeReport(raw,evidence).status,'evidence_found');
  assert.equal(normalizeReport(raw,{sources:[]}).status,'inconclusive');
  assert.equal(normalizeReport({...raw,identityMatched:'true'},evidence).status,'inconclusive');
  assert.equal(normalizeReport({...raw,credentials:[]},evidence).status,'inconclusive');
});
test('hostile model values cannot create unsafe links or crash normalization', () => {
  const result = normalizeReport({...raw, credentials:[null,{}, {title:'Bad',url:'javascript:alert(1)'}], limitations:[{},'Unknown'], name:{html:'bad'}}, {searched:true,sources:[null,{url:'data:text/html,hi'},{url:'https://example.edu/a'},{url:'https://example.edu/a'}]});
  assert.equal(result.status,'inconclusive'); assert.equal(result.sources.length,1); assert.equal(result.credentials.length,0); assert.equal(result.name,'');
});
test('Gemini uses header authentication and enables search without paid fallback', () => {
  const request=requestFor('gemini','unit-test-key',{profileUrl:'https://x.com/ada'});
  assert.match(request.url,/gemini-2\.5-flash-lite:generateContent$/);
  assert.ok(!request.url.includes('unit-test-key'));
  assert.equal(request.init.headers['x-goog-api-key'],'unit-test-key');
  const payload=JSON.parse(request.init.body); assert.deepEqual(payload.tools,[{google_search:{}}]);
  assert.match(payload.systemInstruction.parts[0].text,/untrusted/);
});
test('decodes provider metadata, not the model-invented sources array', () => {
  const response={candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...raw,sources:[{url:'https://fake.test'}]})}]},groundingMetadata:{webSearchQueries:['Ada'],groundingChunks:[{web:{uri:'https://example.edu/ada',title:'Faculty'}}],searchEntryPoint:{renderedContent:'<div>Search</div>'}}}]};
  const decoded=decodeResponse('gemini',response); const report=normalizeReport(decoded.raw,decoded.evidence);
  assert.equal(report.sources[0].url,'https://example.edu/ada'); assert.match(report.searchSuggestions,/Search/);
  assert.throws(()=>decodeResponse('gemini',{candidates:[{finishReason:'MAX_TOKENS'}]}));
});
test('provider failure messages redact raw response and never retry automatically', async () => {
  let calls=0;
  await assert.rejects(research('gemini','unit-test-key',{},async()=>{calls++;return {ok:false,status:429,text:()=> 'secret'};}), /quota/);
  assert.equal(calls,1);
  await assert.rejects(research('gemini','unit-test-key',{},async()=>({ok:false,status:403})), /rejected/);
  await assert.rejects(research('gemini','unit-test-key',{},async()=>{throw new TypeError('network secret');}), /internet/);
});
test('404 diagnostics list model IDs without retrying generation or exposing provider text', async () => {
  const calls = [];
  await assert.rejects(research('gemini', 'unit-test-key', {}, async (url, init) => {
    calls.push({url, init});
    return calls.length === 1 ? {ok:false,status:404} : {ok:true,json:async()=>({models:[
      {name:'models/gemini-test-lite',supportedGenerationMethods:['generateContent']},
      {name:'secret <html>',supportedGenerationMethods:['generateContent']},
      {name:'models/gemini-embedding',supportedGenerationMethods:['embedContent']}
    ]})};
  }), error => /gemini-test-lite/.test(error.message) && !/secret|embedding/.test(error.message) && /No model switch/.test(error.message));
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /\/models\?pageSize=1000$/);
  assert.equal(calls[1].init.method, undefined);
  assert.equal(calls[1].init.headers['x-goog-api-key'], 'unit-test-key');
  await assert.rejects(research('gemini', 'unit-test-key', {}, async url => {
    if (url.includes(':generateContent')) return {ok:false,status:404};
    throw new Error('secret');
  }), error => /HTTP 404/.test(error.message) && !/secret/.test(error.message));
});
test('optional provider adapters preserve search and extract citations', () => {
  const payload=JSON.parse(requestFor('openai','unit-test-key',{}).init.body);
  assert.equal(payload.temperature,undefined); assert.ok(payload.web_search_options);
  const decoded=decodeResponse('perplexity',{choices:[{message:{content:JSON.stringify(raw)}}],citations:['https://example.edu/ada']});
  assert.equal(normalizeReport(decoded.raw,decoded.evidence).status,'evidence_found');
});
test('successful provider call reaches a sourced report through the complete adapter',async()=>{
  let sent;
  const report=await research('gemini','unit-test-key',{profileUrl:'https://x.com/ada'},async(url,init)=>{
    sent={url,init};
    return {ok:true,async json(){return {candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(raw)}]},groundingMetadata:{webSearchQueries:['Ada faculty'],groundingChunks:[{web:{uri:'https://example.edu/ada',title:'Faculty'}}]}}]};}};
  });
  assert.equal(report.status,'evidence_found');assert.equal(report.sources[0].url,'https://example.edu/ada');assert.equal(sent.init.method,'POST');
});
test('a slow provider request is aborted and yields a useful timeout',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const pending=research('gemini','unit-test-key',{},async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))));
  const assertion=assert.rejects(pending,/timed out after 60 seconds/);
  context.mock.timers.tick(60001);await assertion;
});


test('dossier separates unrelated Lalit profiles and keeps missing education explicit',()=>{
  const creator={displayName:'Unscripted by Lalit',username:'@lalitcrock7203',profileUrl:'https://youtube.com/@lalitcrock7203'};
  const fulfilled=sources=>({status:'fulfilled',value:{sources}});
  const dossier=buildDossier(creator,[fulfilled([
    {title:'Lalit BC',url:'https://www.linkedin.com/in/lalit-bc',excerpt:'Fort Valley State University agricultural professional'},
    {title:'Lalit .',url:'https://www.linkedin.com/in/lalit-it',excerpt:'Myarth IT consultancy'},
    {title:'Unscripted by Lalit',url:'https://example.test/lalit',excerpt:'Host biography'}]),fulfilled([]),{status:'rejected',reason:new Error('quota reached')},fulfilled([
    {title:'Instagram',url:'https://instagram.com/unscripted_by_lalit',excerpt:'Log In Sign Up Unscripted by Lalit profile picture'},
    {title:'Instagram duplicate',url:'https://instagram.com/unscripted_by_lalit?tracking=1',excerpt:'Unscripted by Lalit'}])]);
  assert.equal(dossier.sections[0].sources.length,1);assert.equal(dossier.sections[0].candidates.length,2);
  assert.equal(dossier.sections[0].candidates[0].label,'LinkedIn · self-reported');
  assert.equal(dossier.sections[1].sources.length,0);assert.match(dossier.sections[2].error,/quota/);
  assert.equal(dossier.sections[3].sources.length,1);assert.ok(!dossier.sections[3].sources[0].excerpt.includes('Log In'));
  assert.equal(dossier.partial,true);assert.equal(dossier.identityMatched,false);
});

test('identity hints validate LinkedIn hosts and canonicalize only public profiles',()=>{
  const c=normalizeCreator({profileUrl:'https://tiktok.com/@bipin.sth',displayName:' Bipin ',context:'Nepal',linkedinUrl:'https://np.linkedin.com/in/bipin/?trk=search'});
  assert.equal(c.linkedinUrl,'https://www.linkedin.com/in/bipin');assert.equal(c.context,'Nepal');assert.equal(c.displayName,'Bipin');
  for(const linkedinUrl of ['https://linkedin.com.evil.test/in/bipin','https://secret@linkedin.com/in/bipin','https://linkedin.com/company/example','http://linkedin.com/in/bipin','javascript:alert(1)'])assert.throws(()=>normalizeCreator({profileUrl:c.profileUrl,linkedinUrl}),/LinkedIn/);
});

test('user-supplied LinkedIn hints narrow career queries without verifying identity',()=>{
  const creator=normalizeCreator({profileUrl:'https://tiktok.com/@bipin.sth',displayName:'Bipin',context:'Public creator Nepal',linkedinUrl:'https://linkedin.com/in/example'});
  const career=JSON.parse(requestFor('tavily','test',creator,'career').init.body);
  assert.match(career.query,/Public creator Nepal/);assert.match(career.query,/linkedin.com\/in\/example/);
  const social=JSON.parse(requestFor('tavily','test',creator,'social').init.body);assert.ok(!social.query.includes('/in/example'));
  const response={status:'fulfilled',value:{sources:[{url:creator.linkedinUrl,title:'Different display name',excerpt:'Career'}]}};
  const dossier=buildDossier(creator,[response,response,{status:'fulfilled',value:{sources:[]}},{status:'fulfilled',value:{sources:[]}}]);
  assert.equal(dossier.sections[0].sources.length,1);assert.match(dossier.sections[0].sources[0].match,/supplied by you/);assert.equal(dossier.identityMatched,false);
});

test('unrelated provider citations cannot validate a model-invented credential link',()=>{
  const report=normalizeReport({status:'evidence_found',identityMatched:true,credentials:[{title:'Claimed degree',url:'https://invented.example/degree'}]},
    {searched:true,sources:[{url:'https://example.edu/unrelated'}]});
  assert.equal(report.status,'inconclusive');assert.deepEqual(report.credentials,[]);
  assert.match(report.limitations.join(' '),/no matching provider-returned citation/);
  const supported=normalizeReport({status:'evidence_found',identityMatched:true,credentials:[{title:'Degree',url:'https://example.edu/profile?utm_source=test'}]},
    {searched:true,sources:[{url:'https://example.edu/profile'}]});
  assert.equal(supported.status,'evidence_found');
});

test('dossier deduplication preserves distinct query-identified publications',()=>{
  const creator={displayName:'Jane Doe',username:'@janedoe',profileUrl:'https://x.com/janedoe'};
  const empty={status:'fulfilled',value:{sources:[]}};
  const publication={status:'fulfilled',value:{sources:[
    {title:'Jane Doe first work',url:'https://www.youtube.com/watch?v=111',excerpt:'Jane Doe'},
    {title:'Jane Doe second work',url:'https://www.youtube.com/watch?v=222',excerpt:'Jane Doe'},
    {title:'Jane Doe duplicate',url:'https://www.youtube.com/watch?v=111&utm_source=test',excerpt:'Jane Doe'}]}};
  const result=buildDossier(creator,[empty,empty,publication,empty]);
  assert.equal(result.sections[2].sources.length,2);
  const credential=normalizeReport({status:'evidence_found',identityMatched:true,credentials:[{title:'Wrong article',url:'https://example.edu/article?id=1'}]},
    {searched:true,sources:[{url:'https://example.edu/article?id=2'}]});
  assert.equal(credential.status,'inconclusive');
});
