import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Window} from 'happy-dom';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function windowAt(url,html) {
  const win=new Window({url});win.document.body.innerHTML=html;
  const roots=new Map();const attach=win.Element.prototype.attachShadow;
  win.Element.prototype.attachShadow=function(options){const root=attach.call(this,options);roots.set(this,root);return root;};
  const messages=[];
  win.chrome={runtime:{async sendMessage(m){messages.push(m);return {success:false,error:'No API key saved. Open settings.'};}}};
  win.eval(read('lib/identity.js'));win.eval(read('lib/report.js'));
  return {win,roots,messages};
}
test('YouTube watch creator uses channel ID, no API calls until click, no duplicate badges',async()=>{
  const {win,roots,messages}=windowAt('https://www.youtube.com/watch?v=abc','<ytd-video-owner-renderer><div id="channel-name"><a href="/channel/UCabcXYZ">Ada</a></div></ytd-video-owner-renderer>');
  win.eval(read('content/content.js'));
  const host=win.document.querySelector('[data-expertseal-badge]');assert.ok(host);assert.equal(host.shadowRoot,null);assert.equal(messages.length,0);
  roots.get(host).querySelector('button').click();await delay(10);
  assert.equal(messages[0].creator.profileUrl,'https://www.youtube.com/channel/UCabcXYZ');
  assert.match(roots.get(win.document.querySelector('[data-expertseal-panel]')).textContent,/No API key/);
  win.document.body.append(win.document.createElement('p'));await delay(350);
  assert.equal(win.document.querySelectorAll('[data-expertseal-badge]').length,1);
  win.happyDOM.abort();
});
test('modern YouTube channel header uses route and rejects recommended channel identity',()=>{
  const {win,roots,messages}=windowAt('https://www.youtube.com/@ada/videos','<ytd-page-header-renderer><h1>Ada Research</h1><a href="/@someoneElse">Recommended</a></ytd-page-header-renderer>');
  win.eval(read('content/content.js'));roots.get(win.document.querySelector('[data-expertseal-badge]')).querySelector('button').click();
  assert.equal(messages[0].creator.profileUrl,'https://www.youtube.com/@ada');win.happyDOM.abort();
});
test('X feed checks the clicked article author',()=>{
  const {win,roots,messages}=windowAt('https://x.com/home','<article data-testid="tweet"><div data-testid="User-Name"><a href="/first"><span>First</span></a></div></article><article data-testid="tweet"><div data-testid="User-Name"><a href="/second"><span>Second</span></a></div></article>');
  win.eval(read('content/content.js'));const hosts=win.document.querySelectorAll('[data-expertseal-badge]');assert.equal(hosts.length,2);
  roots.get(hosts[1]).querySelector('button').click();assert.equal(messages[0].creator.profileUrl,'https://x.com/second');win.happyDOM.abort();
});
test('TikTok profile binds the profile URL and public bio',()=>{
  const {win,roots,messages}=windowAt('https://www.tiktok.com/@ada','<div><h1 data-e2e="user-title">ada</h1><h2 data-e2e="user-subtitle">Ada</h2><p data-e2e="user-bio">Researcher</p></div>');
  win.eval(read('content/content.js'));roots.get(win.document.querySelector('[data-expertseal-badge]')).querySelector('button').click();
  assert.equal(messages[0].creator.username,'@ada');assert.equal(messages[0].creator.bio,'Researcher');win.happyDOM.abort();
});
test('report treats model text as text and isolates provider suggestion HTML',()=>{
  const {win}=windowAt('https://example.test','<div id="report"></div>');
  win.ExpertSealReport.render(win.document.getElementById('report'),{creator:{username:'@ada',profileUrl:'https://x.com/ada'},provider:'gemini',timestamp:Date.now(),cached:false,data:{name:'<img src=x onerror=alert(1)>',status:'inconclusive',field:'Science',summary:'<script>evil()</script>',credentials:[{title:'PhD',institution:'Example',url:'javascript:alert(1)'}],sources:[],limitations:[],searchSuggestions:'<script>evil()</script><p>Google suggestions</p>'}});
  assert.equal(win.document.querySelectorAll('script,img').length,0);
  assert.ok(!Array.from(win.document.querySelectorAll('a')).some(a=>a.href.startsWith('javascript:')));
  const frame=win.document.querySelector('iframe');assert.ok(frame);assert.ok(!frame.getAttribute('sandbox').includes('allow-scripts'));assert.match(frame.srcdoc,/default-src 'none'/);win.happyDOM.abort();
});
test('Tavily excerpts render as text and cannot produce a verified badge',()=>{
  const {win}=windowAt('https://example.test','<div id="report"></div>');
  win.ExpertSealReport.render(win.document.getElementById('report'),{creator:{username:'@ada',profileUrl:'https://x.com/ada'},provider:'tavily',timestamp:Date.now(),cached:false,data:{mode:'sources',name:'Ada',status:'inconclusive',summary:'Review results',credentials:[],sources:[{title:'Faculty',url:'https://example.edu/ada',excerpt:'<img src=x onerror=alert(1)>'}],limitations:[]}});
  assert.equal(win.document.querySelectorAll('img,script').length,0);
  assert.match(win.document.body.textContent,/SOURCE SEARCH/);
  assert.match(win.document.body.textContent,/Not verified/);
  assert.match(win.document.body.textContent,/<img/);
  assert.equal(win.document.querySelector('.found'),null);win.happyDOM.abort();
});
test('popup clears entered key after saving and sends manual research only on click',async()=>{
  const {win,messages}=windowAt('chrome-extension://expertseal-test/popup/popup.html?view=full',read('popup/popup.html'));
  win.chrome.runtime.sendMessage=async m=>{messages.push(m);return {success:true,settings:{provider:'gemini',configured:{gemini:m.action==='saveSettings'}},totalVerifications:0,cachedCreators:0};};
  win.eval(read('popup/popup.js'));await delay(10);
  assert.ok(win.document.body.classList.contains('full-page'));assert.equal(messages.filter(m=>m.action==='verify').length,0);
  win.document.getElementById('api-key').value='unit-test-key-123456789012345';win.document.getElementById('save').click();await delay(10);
  assert.equal(win.document.getElementById('api-key').value,'');assert.match(win.document.getElementById('status').textContent,/Ready/);
  win.document.getElementById('profile-url').value='https://x.com/ada';win.document.getElementById('verify').click();await delay(10);
  assert.equal(messages.filter(m=>m.action==='verify').length,1);win.happyDOM.abort();
});
test('late research responses do not reopen a dismissed report after navigation',async()=>{
  const {win,roots}=windowAt('https://www.youtube.com/@ada','<ytd-page-header-renderer><h1>Ada</h1></ytd-page-header-renderer>');
  let resolve;win.chrome.runtime.sendMessage=()=>new Promise(r=>resolve=r);
  win.eval(read('content/content.js'));roots.get(win.document.querySelector('[data-expertseal-badge]')).querySelector('button').click();
  assert.ok(win.document.querySelector('[data-expertseal-panel]'));
  win.history.pushState({},'','/@other');win.dispatchEvent(new win.Event('yt-navigate-finish'));await delay(350);
  assert.equal(win.document.querySelector('[data-expertseal-panel]'),null);
  resolve({success:false,error:'Late response'});await delay(10);
  assert.equal(win.document.querySelector('[data-expertseal-panel]'),null);win.happyDOM.abort();
});

test('background report groups evidence and collapses unmatched people and excerpts',()=>{
  const {win}=windowAt('https://example.test','<div id="report"></div>');
  win.ExpertSealReport.render(win.document.getElementById('report'),{creator:{username:'@lalitcrock7203',profileUrl:'https://youtube.com/@lalitcrock7203'},provider:'tavily',timestamp:Date.now(),cached:false,data:{mode:'dossier',name:'Unscripted by Lalit',status:'inconclusive',summary:'Background research',credentials:[],sources:[],limitations:[],sections:[
    {title:'Career experience',sources:[],candidates:[{title:'Lalit BC',url:'https://linkedin.com/in/example',label:'LinkedIn · self-reported',match:'No exact name/handle match',excerpt:'<script>untrusted()</script>'}]},
    {title:'Education',sources:[],candidates:[]},{title:'Publications & authored work',sources:[],candidates:[]},{title:'Social presence',sources:[],candidates:[]}]}});
  assert.equal(win.document.querySelectorAll('.section').length,4);
  assert.match(win.document.body.textContent,/No matching evidence found/);
  assert.match(win.document.body.textContent,/may be other people/);
  assert.ok([...win.document.querySelectorAll('details')].every(d=>!d.open));
  assert.equal(win.document.querySelectorAll('script').length,0);win.happyDOM.abort();
});

test('TikTok feed buttons target explicit authors, not caption mentions, without duplicate badges',async()=>{
  const {win,roots,messages}=windowAt('https://www.tiktok.com/foryou','<div data-e2e="feed-item"><a href="/@mentioned">Mention</a><div data-e2e="video-author-container"><a href="/@first">First</a></div></div><div data-e2e="feed-item"><a href="/@unrelated">Caption</a><div data-e2e="video-author-container"><a href="/@second">Second</a></div></div>');
  win.eval(read('content/content.js'));
  const badges=win.document.querySelectorAll('[data-expertseal-badge]');assert.equal(badges.length,2);assert.equal(messages.length,0);
  roots.get(badges[1]).querySelector('button').click();assert.equal(messages[0].creator.profileUrl,'https://www.tiktok.com/@second');
  win.document.body.append(win.document.createElement('p'));await delay(350);assert.equal(win.document.querySelectorAll('[data-expertseal-badge]').length,2);win.happyDOM.abort();
});

test('TikTok route changes never pair a new handle with a stale profile name',async()=>{
  const {win,roots,messages}=windowAt('https://www.tiktok.com/@ada','<div><h1 data-e2e="user-title">ada</h1><h2 data-e2e="user-subtitle">Ada</h2><p data-e2e="user-bio">Researcher</p></div>');
  win.eval(read('content/content.js'));const old=win.document.querySelector('[data-expertseal-badge]');
  win.history.pushState({},'','/@grace');roots.get(old).querySelector('button').click();assert.equal(messages.length,0);
  win.dispatchEvent(new win.Event('popstate'));await delay(350);assert.equal(win.document.querySelectorAll('[data-expertseal-badge]').length,0);
  win.document.querySelector('[data-e2e="user-title"]').textContent='grace';win.document.querySelector('[data-e2e="user-subtitle"]').textContent='Grace';
  await delay(350);const badge=win.document.querySelector('[data-expertseal-badge]');assert.ok(badge);roots.get(badge).querySelector('button').click();
  assert.equal(messages[0].creator.profileUrl,'https://www.tiktok.com/@grace');assert.equal(messages[0].creator.displayName,'Grace');win.happyDOM.abort();
});

test('TikTok video page ignores suggested profile headers and uses video author',()=>{
  const {win,roots,messages}=windowAt('https://www.tiktok.com/@ada/video/123','<div><h1 data-e2e="user-title">someoneelse</h1><h2 data-e2e="user-subtitle">Other</h2></div><a data-e2e="video-author-container" href="/@ada">Ada</a>');
  win.eval(read('content/content.js'));const badges=win.document.querySelectorAll('[data-expertseal-badge]');assert.equal(badges.length,1);
  roots.get(badges[0]).querySelector('button').click();assert.equal(messages[0].creator.username,'@ada');win.happyDOM.abort();
});

test('report export excludes unmatched people and unrelated secrets',()=>{
  const {win}=windowAt('https://example.test','');
  const output=win.ExpertSealReport.exportText({apiKey:'secret-should-not-export',creator:{username:'@bipin.sth',profileUrl:'https://tiktok.com/@bipin.sth',context:'Nepal',linkedinUrl:'https://linkedin.com/in/example'},provider:'tavily',timestamp:Date.now(),data:{summary:'Leads only',sections:[{title:'Career',sources:[{title:'Known lead',url:'https://example.edu',label:'Institution',match:'Unconfirmed',excerpt:'Public excerpt'}],candidates:[{title:'Unrelated private person'}]}],limitations:['Not verified']}});
  assert.match(output,/Known lead/);assert.match(output,/connection unverified/);assert.match(output,/unmatched results excluded/);
  assert.ok(!output.includes('secret-should-not-export'));assert.ok(!output.includes('Unrelated private person'));win.happyDOM.abort();
});

test('popup prefilled creator and history do not launch research or expose keys',async()=>{
  const {win,messages}=windowAt('chrome-extension://expertseal-test/popup/popup.html?view=full&profile=https%3A%2F%2Fwww.tiktok.com%2F%40bipin.sth&name=Bipin',read('popup/popup.html'));
  const result={creator:{profileUrl:'https://www.tiktok.com/@bipin.sth',username:'@bipin.sth',displayName:'Bipin',context:'Nepal',linkedinUrl:''},provider:'tavily',timestamp:Date.now(),cached:true,data:{mode:'sources',name:'Bipin',summary:'Review',credentials:[],sources:[],limitations:[]}};
  win.chrome.runtime.sendMessage=async m=>{messages.push(m);if(m.action==='getHistory')return {success:true,reports:[{id:'test-report',...result}]};if(m.action==='getReport')return {success:true,...result};return {success:true,settings:{provider:'tavily',configured:{tavily:true}},totalVerifications:1,cachedCreators:1};};
  win.eval(read('popup/popup.js'));await delay(20);
  assert.equal(win.document.getElementById('profile-url').value,result.creator.profileUrl);assert.equal(messages.filter(m=>m.action==='verify').length,0);
  win.document.querySelector('.history-open').click();await delay(20);
  assert.equal(win.document.getElementById('creator-context').value,'Nepal');assert.match(win.document.getElementById('progress').textContent,/No API credits/);
  assert.equal(messages.filter(m=>m.action==='verify').length,0);win.happyDOM.abort();
});

test('live November TikTok layout puts display name in nested h1 and username in h2',()=>{
  const {win,roots,messages}=windowAt('https://www.tiktok.com/@aasthasubedii','<div id="main-content-others_homepage"><div><div><h1 data-e2e="user-title">aastha❤️</h1></div><div></div><h2 data-e2e="user-subtitle">aasthasubedii</h2></div><div><h2 data-e2e="user-bio">No bio yet.</h2></div></div>');
  win.eval(read('content/content.js'));const host=win.document.querySelector('[data-expertseal-badge]');assert.ok(host);
  assert.equal(messages.length,0);roots.get(host).querySelector('button').click();
  assert.equal(messages[0].creator.profileUrl,'https://www.tiktok.com/@aasthasubedii');assert.equal(messages[0].creator.displayName,'aastha❤️');assert.equal(messages[0].creator.bio,'');win.happyDOM.abort();
});

test('TikTok header hydration via text-node updates triggers detection',async()=>{
  const {win}=windowAt('https://www.tiktok.com/@aasthasubedii','<div><div><h1 data-e2e="user-title">aastha❤️</h1></div><h2 data-e2e="user-subtitle">Loading</h2></div>');
  win.eval(read('content/content.js'));assert.equal(win.document.querySelectorAll('[data-expertseal-badge]').length,0);
  win.document.querySelector('[data-e2e="user-subtitle"]').firstChild.data='aasthasubedii';
  await delay(350);assert.equal(win.document.querySelectorAll('[data-expertseal-badge]').length,1);
  assert.equal(win.document.documentElement.dataset.expertsealVersion,'development');win.happyDOM.abort();
});
