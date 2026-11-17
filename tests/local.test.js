import test from 'node:test';
import assert from 'node:assert/strict';
import '../lib/identity.js';
import {localHealth,localResearch} from '../lib/local-research.js';
const creator=globalThis.ExpertSealIdentity.normalizeCreator({profileUrl:'https://x.com/avery_fixture',subject:'biology'});
export const localData={mode:'expertise',identity:{state:'unresolved',evidence:[],explanation:'No direct link found.'},statements:['identity','education','experience','topic'].map(id=>({id,text:id+': insufficient evidence.',urls:[]})),credentials:[],sources:[],leads:[],limitations:[],topic:{subject:'biology',credentialIds:[]},summaryMode:'deterministic'};
test('local adapter sends only to fixed loopback, uses header auth and bounded validated report',async()=>{
  const seen=[];const fake=async(url,init)=>{seen.push({url,init});return new Response(JSON.stringify({protocol:1,configId:'fixture-config',data:localData}));};
  await localHealth('fixture-secret',fake);const r=await localResearch('fixture-secret',creator,'fixture-config',fake);
  assert.equal(r.mode,'expertise');assert.ok(seen.every(r=>r.url.startsWith('http://127.0.0.1:3210/v1/')));assert.ok(seen.every(r=>r.init.headers.Authorization==='Bearer fixture-secret'));
  assert.ok(!seen[1].init.body.includes('fixture-secret'));assert.equal(JSON.parse(seen[1].init.body).creator.subject,'biology');
  assert.equal(seen[1].init.redirect,'error');assert.equal(seen[1].init.credentials,'omit');
});
test('uninstalled companion, rejected authorization, invalid response and changed configuration fail explicitly',async()=>{
  await assert.rejects(localHealth('secret',async()=>{throw new TypeError();}),/not reachable/);
  await assert.rejects(localHealth('secret',async()=>new Response('{}',{status:403})),/rejected access/);
  await assert.rejects(localResearch('secret',creator,'a',async()=>new Response(JSON.stringify({protocol:1,configId:'b',data:localData}))),/configuration changed/);
  await assert.rejects(localResearch('secret',creator,'a',async()=>new Response(JSON.stringify({protocol:1,configId:'a',data:{...localData,statements:[]}}))),/invalid evidence/);
  await assert.rejects(localHealth('secret',async()=>new Response('x'.repeat(300000))),/size limit/);
});
