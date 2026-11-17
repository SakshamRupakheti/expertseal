import test from 'node:test';
import assert from 'node:assert/strict';
const local={},sync={provider:'gemini',geminiApiKey:'unit-test-credential-1234567890'};
function area(data) { return {
  access:'', async setAccessLevel({accessLevel}){this.access=accessLevel;},
  async get(keys){if(keys===null)return structuredClone(data); const list=typeof keys==='string'?[keys]:Array.isArray(keys)?keys:Object.keys(keys); return structuredClone(Object.fromEntries(list.map(k=>[k,data[k]??(Array.isArray(keys)||typeof keys==='string'?undefined:keys[k])])));},
  async set(values){Object.assign(data,structuredClone(values));}, async remove(keys){for(const k of Array.isArray(keys)?keys:[keys])delete data[k];}
}; }
globalThis.chrome={storage:{local:area(local),sync:area(sync)},runtime:{id:'expertseal-test',getURL:path=>'chrome-extension://expertseal-test/'+path,onMessage:{addListener(){}},async openOptionsPage(){}}};
let calls=0, gate;
globalThis.fetch=async()=>{
  calls++;
  if(gate)await gate;
  return {ok:true,async json(){
    return {candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({status:'inconclusive',summary:'No matching records.'})}]}}]};
  }};
};
const {dispatch}=await import('../background/service-worker.js');
const own={id:'expertseal-test',url:'chrome-extension://expertseal-test/popup/popup.html?view=full'};
const social={id:'expertseal-test',url:'https://www.youtube.com/watch?v=test',tab:{id:1}};
const creator={profileUrl:'https://www.youtube.com/@testcreator',displayName:'Test'};
test('migration removes synced keys and settings responses never expose secrets',async()=>{
  const result=await dispatch({action:'getSettings'},own);
  assert.equal(result.settings.configured.gemini,true);assert.equal(sync.geminiApiKey,undefined);
  assert.equal(chrome.storage.local.access,'TRUSTED_CONTEXTS'); assert.equal(chrome.storage.sync.access,'TRUSTED_CONTEXTS');
  assert.ok(!JSON.stringify(result).includes('unit-test-credential'));
});
test('content scripts and foreign senders cannot read settings or modify keys',async()=>{
  await assert.rejects(dispatch({action:'getSettings'},social),/settings/);
  await assert.rejects(dispatch({action:'saveSettings',provider:'gemini',apiKey:'attacker-key-123456789012'},social),/settings/);
  await assert.rejects(dispatch({action:'verify',creator},{...social,id:'foreign'}),/cannot/);
  await assert.rejects(dispatch({action:'verify',creator:{profileUrl:'https://x.com/other'}},social),/platform/);
});
test('verification uses cache, explicit refresh spends one request, counter increments',async()=>{
  const start=calls;
  const one=await dispatch({action:'verify',creator},social);assert.equal(one.cached,false);
  const two=await dispatch({action:'verify',creator},social);assert.equal(two.cached,true);assert.equal(calls,start+1);
  await dispatch({action:'verify',creator,refresh:true},social);assert.equal(calls,start+2);
  assert.equal((await dispatch({action:'getCacheStats'},own)).totalVerifications,2);
});
test('cache expires and channel IDs do not collide by case',async()=>{
  for(const k of Object.keys(local).filter(k=>k.startsWith('es_v')))local[k].timestamp=0;
  const start=calls;await dispatch({action:'verify',creator},social);assert.equal(calls,start+1);
  await dispatch({action:'verify',creator:{profileUrl:'https://youtube.com/channel/UCabc'}},own);
  await dispatch({action:'verify',creator:{profileUrl:'https://youtube.com/channel/UCABC'}},own);
  assert.equal(calls,start+3);
});
test('duplicate in-flight checks share request; clearing cache while pending stays cleared',async()=>{
  let release;gate=new Promise(r=>release=r);const start=calls;
  const a=dispatch({action:'verify',creator,refresh:true},own);
  const b=dispatch({action:'verify',creator,refresh:true},own);
  await new Promise(r=>setTimeout(r,10));assert.equal(calls,start+1);
  await dispatch({action:'clearCache'},own); release();await Promise.all([a,b]);gate=null;
  assert.equal((await dispatch({action:'getCacheStats'},own)).cachedCreators,0);
  assert.ok(local.settingsV2.keys.gemini);
});
test('saving provider is explicit and clearing a key prevents further paid requests',async()=>{
  await dispatch({action:'saveSettings',provider:'perplexity',apiKey:'unit-test-another-key-123456789'},own);
  assert.equal((await dispatch({action:'getSettings'},own)).settings.provider,'perplexity');
  await dispatch({action:'removeKey',provider:'perplexity'},own);
  const start=calls;await assert.rejects(dispatch({action:'verify',creator},own),/No API key/);assert.equal(calls,start);
});

test('Tavily key stays private and source reports use their own cache',async()=>{
  const previous=globalThis.fetch;let requests=0;
  globalThis.fetch=async url=>{requests++;assert.equal(url,'https://api.tavily.com/search');return {ok:true,json:async()=>({results:[{title:'Record',url:'https://example.edu/person',content:'Public record'}]})};};
  try {
    const saved=await dispatch({action:'saveSettings',provider:'tavily',apiKey:'unit-test-tavily-key-1234567890'},own);
    assert.equal(saved.settings.configured.tavily,true);assert.ok(!JSON.stringify(saved).includes('unit-test-tavily'));
    const first=await dispatch({action:'verify',creator},social);assert.equal(first.data.mode,'dossier');assert.equal(first.cached,false);
    const second=await dispatch({action:'verify',creator},social);assert.equal(second.cached,true);assert.equal(requests,4);
    await dispatch({action:'removeKey',provider:'tavily'},own);
    await assert.rejects(dispatch({action:'verify',creator},social),/No API key/);
  } finally {globalThis.fetch=previous;}
});

test('history is settings-only, uses no API and rejects secret storage IDs',async()=>{
  await assert.rejects(dispatch({action:'getHistory'},social),/settings/);
  await assert.rejects(dispatch({action:'getReport',id:'settingsV2'},own),/Invalid report/);
  await assert.rejects(dispatch({action:'deleteReport',id:'settingsV2'},own),/Invalid report/);
  const before=calls;const history=await dispatch({action:'getHistory'},own);
  assert.ok(!JSON.stringify(history).includes('unit-test-credential'));
  if(history.reports.length){const r=await dispatch({action:'getReport',id:history.reports[0].id},own);assert.equal(r.cached,true);}
  assert.equal(calls,before);
});

test('different identity hints use different caches and reports can be deleted independently',async()=>{
  await dispatch({action:'saveSettings',provider:'gemini',apiKey:'unit-test-credential-1234567890'},own);
  const before=calls;
  const a={...creator,context:'Institution A'},b={...creator,context:'Institution B'};
  await dispatch({action:'verify',creator:a},own);await dispatch({action:'verify',creator:b},own);
  assert.equal(calls,before+2);await dispatch({action:'verify',creator:a},own);assert.equal(calls,before+2);
  const history=await dispatch({action:'getHistory'},own);const row=history.reports.find(r=>r.creator.context==='Institution A');
  await dispatch({action:'deleteReport',id:row.id},own);await assert.rejects(dispatch({action:'getReport',id:row.id},own),/removed/);
  assert.ok((await dispatch({action:'getHistory'},own)).reports.some(r=>r.creator.context==='Institution B'));
});

test('saved reports are capped at 50 and expired reports cannot be opened',async()=>{
  const current=Object.values(local).find(r=>r?.version && r?.data);
  assert.ok(current);
  for(let i=0;i<55;i++)local[`es_v${current.version}_fixture_${i}`]={...structuredClone(current),timestamp:Date.now()-1000-i};
  const expiredId=`es_v${current.version}_expired`;local[expiredId]={...structuredClone(current),timestamp:Date.now()-8*86400000};
  await assert.rejects(dispatch({action:'getReport',id:expiredId},own),/expired/);
  await dispatch({action:'verify',creator:{...creator,context:'Retention trigger'},refresh:true},own);
  assert.equal(Object.keys(local).filter(k=>k.startsWith('es_v')).length,50);
  assert.equal(local[expiredId],undefined);
});

test('legacy generic keys stay with Gemini while clean installs default to Tavily',async()=>{
  const previousChrome=globalThis.chrome;
  try {
    for(const [index,legacy] of [{apiKey:'unit-test-legacy-gemini-key-1234'},{}].entries()) {
      const isolatedLocal={},isolatedSync={...legacy};
      globalThis.chrome={storage:{local:area(isolatedLocal),sync:area(isolatedSync)},runtime:previousChrome.runtime};
      const isolated=await import(`../background/service-worker.js?migration-case=${index}`);
      const res=await isolated.dispatch({action:'getSettings'},own);
      assert.equal(res.settings.provider,index===0?'gemini':'tavily');
      assert.equal(res.settings.configured.gemini,index===0);assert.equal(res.settings.configured.tavily,false);
      assert.ok(!JSON.stringify(res).includes('unit-test-legacy'));
      assert.equal(isolatedSync.apiKey,undefined);
    }
  } finally {globalThis.chrome=previousChrome;}
});

test('clear waits for an already-started storage write and leaves no reports behind',async()=>{
  const previousSet=chrome.storage.local.set;
  let unblock,entered;
  const blocked=new Promise(resolve=>entered=resolve);
  const gate=new Promise(resolve=>unblock=resolve);
  chrome.storage.local.set=async values=>{
    if(Object.keys(values).some(k=>k.startsWith('es_v'))){entered();await gate;}
    return previousSet(values);
  };
  try {
    const pending=dispatch({action:'verify',creator:{...creator,context:'Clear during pending storage write'},refresh:true},own);
    await blocked;
    const clearing=dispatch({action:'clearCache'},own);
    unblock();await Promise.all([pending,clearing]);
    assert.equal(Object.keys(local).filter(k=>k.startsWith('es_v')).length,0);
  } finally {unblock();chrome.storage.local.set=previousSet;}
});

test('optional local mode keeps token private, requires permission and isolates cache by topic and configuration',async()=>{
  const previousFetch=globalThis.fetch;let requests=0,configId='config-one';
  chrome.permissions={contains:async()=>false};
  try {
    await dispatch({action:'saveSettings',provider:'local',apiKey:'synthetic-local-token-123456789012345'},own);
    assert.ok(!JSON.stringify(await dispatch({action:'getSettings'},own)).includes('synthetic-local'));
    await assert.rejects(dispatch({action:'verify',creator},social),/Enable local/);
    chrome.permissions.contains=async()=>true;
    globalThis.fetch=async(url,init)=>{
      assert.equal(init.headers.Authorization,'Bearer synthetic-local-token-123456789012345');
      const data={mode:'expertise',identity:{state:'unresolved',evidence:[]},topic:{credentialIds:[]},statements:['identity','education','experience','topic'].map(id=>({id,text:'Not confirmed.',urls:[]})),credentials:[],sources:[],leads:[],limitations:[]};
      if(url.endsWith('/research'))requests++;
      return new Response(JSON.stringify({protocol:1,configId,data}));
    };
    const a={...creator,subject:'biology'};
    await dispatch({action:'verify',creator:a},own);assert.equal(requests,1);
    assert.equal((await dispatch({action:'verify',creator:a},own)).cached,true);assert.equal(requests,1);
    await dispatch({action:'verify',creator:{...a,subject:'physics'}},own);assert.equal(requests,2);
    configId='config-two';await dispatch({action:'verify',creator:a},own);assert.equal(requests,3);
    await dispatch({action:'verify',creator:a,refresh:true},own);assert.equal(requests,4);
    const all=Object.entries(local);for(const [key,value] of all.filter(([key])=>key.startsWith('es_v')))assert.ok(!JSON.stringify({key,value}).includes('synthetic-local'));
    await dispatch({action:'removeKey',provider:'local'},own);await assert.rejects(dispatch({action:'verify',creator:a},own),/No API key/);assert.equal(requests,4);
  } finally {globalThis.fetch=previousFetch;delete chrome.permissions;}
});
