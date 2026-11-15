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
