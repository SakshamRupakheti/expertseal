import test from 'node:test';
import assert from 'node:assert/strict';
import {ResearchEngine} from '../research.js';
import {config,creator} from './fixtures.js';
test('OpenAlex publications and affiliations stay candidates without identity links',async()=>{
  const engine=new ResearchEngine({...config,openalex:true},{getJson:async url=>{
    const u=new URL(url);if(u.hostname!=='api.openalex.org')return {results:[]};
    if(u.pathname==='/authors')return {results:[{id:'https://openalex.org/A123',display_name:'Avery Reed',last_known_institutions:[{display_name:'Example College'}]}]};
    assert.equal(u.searchParams.get('filter'),'author.id:https://openalex.org/A123');return {results:[{title:'Synthetic paper',doi:'https://doi.org/10.0000/fixture'}]};
  }});
  const r=await engine.research(creator);assert.equal(r.identity.state,'possible_match');assert.equal(r.credentials.length,0);assert.ok(r.leads.some(l=>l.title==='Synthetic paper'));
});
test('ORCID direct account link can support self-reported education without collecting contact sections',async()=>{
  const paths=[];const engine=new ResearchEngine({...config,orcidToken:'synthetic-read-public-token'},{getJson:async(url,options)=>{
    const u=new URL(url);if(u.hostname!=='pub.orcid.org')return {results:[]};
    assert.equal(options.headers.Authorization,'Bearer synthetic-read-public-token');paths.push(u.pathname);
    if(u.pathname.endsWith('/search/'))return {result:[{'orcid-identifier':{path:'0000-0000-0000-000X'}}]};
    if(u.pathname.endsWith('/personal-details'))return {name:{'given-names':{value:'Avery'},'family-name':{value:'Reed'}}};
    if(u.pathname.endsWith('/researcher-urls'))return {'researcher-url':[{url:{value:creator.profileUrl}}]};
    if(u.pathname.endsWith('/educations'))return {'affiliation-group':[{summaries:[{'education-summary':{'role-title':'BSc Biology',organization:{name:'Example College'},'department-name':'Biology','start-date':{year:{value:'2018'}}}}]}]};
    return {'affiliation-group':[]};
  }});
  const r=await engine.research(creator);assert.equal(r.identity.state,'matched');assert.equal(r.credentials[0].status,'self_reported');assert.ok(!paths.some(p=>/email|address|\/record$/.test(p)));
  assert.ok(!JSON.stringify(r).includes('synthetic-read-public-token'));
});
