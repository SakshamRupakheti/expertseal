import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {sourceUrl,publicAddress,request,getJson,fetchSource} from '../network.js';
test('SSRF validation blocks local, metadata, mapped, reserved and mixed DNS addresses',async()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','192.168.1.1','169.254.169.254','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','fe80::1','fc00::1','100.64.0.1'])assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress('1.1.1.1'),true);
  for(const url of ['file:///etc/passwd','http://example.org','https://secret@example.org','https://localhost/a','https://example.org:22/a'])assert.throws(()=>sourceUrl(url));
  await assert.rejects(request('https://public.example',{resolver:async()=>[{address:'1.1.1.1',family:4},{address:'127.0.0.1',family:4}]}),/Private/);
  await assert.rejects(fetchSource('https://unapproved.example/a',[]),/approval/);
});
test('bounded transport rejects redirects, large responses and non-JSON endpoints',async()=>{
  const server=http.createServer((req,res)=>{
    if(req.url==='/redirect'){res.writeHead(302,{Location:'http://169.254.169.254/'});res.end();}
    else if(req.url==='/large')res.end('x'.repeat(1024));
    else {res.setHeader('Content-Type','text/html');res.end('<p>JSON disabled</p>');}
  });server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
  try {
    await assert.rejects(request(base+'/redirect',{local:true}),/redirect/);
    await assert.rejects(request(base+'/large',{local:true,maxBytes:100}),/large/);
    await assert.rejects(getJson(base,{local:true}),/JSON/);
    await assert.rejects(request(base),/Unsafe/);
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('source collection respects robots denial, unavailable policy, crawl delay and content types',async()=>{
  const policies=[{origin:'https://example.org',type:'institutional'}];
  for(const robots of [{status:200,text:'User-agent: *\nDisallow: /'},{status:403,text:''},{status:200,text:'User-agent: *\nCrawl-delay: 10\nAllow: /'}]) {
    let calls=0;await assert.rejects(fetchSource('https://example.org/person',policies,null,async()=>{calls++;return robots;}),/disallows|crawl-delay/);assert.equal(calls,1);
  }
  let count=0;await assert.rejects(fetchSource('https://example.org/person',policies,null,async()=>++count===1 ? {status:404,text:''} : {status:200,type:'application/pdf',text:'binary'}),/HTML/);
});
