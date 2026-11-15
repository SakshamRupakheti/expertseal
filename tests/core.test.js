import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/identity.js';
import { extractJson, normalizeReport, requestFor, research, decodeResponse } from '../lib/verification.js';
const { parseProfileUrl, safeUrl, normalizeCreator } = globalThis.ExpertSealIdentity;
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
