import test from 'node:test';
import assert from 'node:assert/strict';
import {ResearchEngine} from '../research.js';
import {config,creator,source} from './fixtures.js';
const dependencies={getJson:async()=>({results:[{url:source().url,title:'Avery Reed',content:'Search lead only'}]}),fetchSource:async()=>source()};
test('full deterministic research yields four attributed statements',async()=>{
  const engine=new ResearchEngine(config,dependencies),r=await engine.research(creator);
  assert.equal(r.identity.state,'matched');assert.equal(r.statements.length,4);assert.equal(r.summaryMode,'deterministic');assert.equal(engine.sessions.size,0);
});
test('missing SearXNG and inaccessible sources produce limited neutral output',async()=>{
  const engine=new ResearchEngine(config,{getJson:async()=>{throw new Error('secret');}});const r=await engine.research(creator);
  assert.equal(r.identity.state,'unresolved');assert.equal(r.partial,true);assert.ok(!JSON.stringify(r).includes('secret'));
  const blocked=await new ResearchEngine(config,{...dependencies,fetchSource:async()=>{throw new Error('source unavailable');}}).research(creator);
  assert.equal(blocked.credentials.length,0);assert.equal(blocked.partial,true);
});
test('malformed and hallucinated Ollama responses fall back without factual changes',async()=>{
  for(const response of ['not JSON','{"statements":[{"text":"Verified doctor"}]}']) {
    const engine=new ResearchEngine({...config,model:'qwen3.5:2b'},{...dependencies,getJson:async url=>String(url).includes('/api/chat') ? {message:{content:response}} : dependencies.getJson()});
    const r=await engine.research(creator);assert.equal(r.summaryMode,'deterministic_fallback');assert.ok(!r.summary.includes('doctor'));
  }
});
test('valid structured model output is checked against canonical statements',async()=>{
  const engine=new ResearchEngine({...config,model:'qwen3.5:2b'},{...dependencies,getJson:async(url,options)=>String(url).includes('/api/chat') ? {message:{content:JSON.stringify({statementIds:JSON.parse(options.json.messages[1].content).statements.map(s=>s.id)})}} : dependencies.getJson()});
  assert.equal((await engine.research(creator)).summaryMode,'ollama_validated');
});
test('research sessions isolate creators and expire',async()=>{
  const engine=new ResearchEngine(config,dependencies),a=await engine.discover(creator),b=await engine.discover({...creator,profileUrl:'https://x.com/other_fixture'});
  assert.notEqual(a.researchId,b.researchId);await engine.match(a.researchId);await engine.match(b.researchId);
  assert.equal(engine.get(a.researchId).identity.state,'matched');assert.equal(engine.get(b.researchId).identity.state,'possible_match');
  await engine.match(a.researchId);assert.equal(engine.get(a.researchId).sources.length,1);
  await assert.rejects(engine.professional(a.researchId),/Discovery is closed/);
  engine.get(a.researchId).created=0;assert.throws(()=>engine.get(a.researchId),/expired/);
});
test('search leads outside approved origins are never fetched',async()=>{
  let fetched=false;const engine=new ResearchEngine({...config,sourceOrigins:[]},{...dependencies,fetchSource:async()=>{fetched=true;return source();}});
  const r=await engine.research(creator);assert.equal(fetched,false);assert.equal(r.credentials.length,0);assert.equal(r.identity.state,'possible_match');
});
