import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
import {InMemoryTransport} from '@modelcontextprotocol/server';
import {createResearchServer} from '../mcp.js';
import {createCompanion} from '../server.js';
import {config,creator,source} from './fixtures.js';
test('official MCP client discovers and invokes real schema-validated tools',async()=>{
  const server=createResearchServer(config,{getJson:async()=>({results:[{url:source().url,title:'Avery Reed'}]}),fetchSource:async()=>source()});
  const client=new Client({name:'fixture-client',version:'1'});const [left,right]=InMemoryTransport.createLinkedPair();
  await server.connect(right);await client.connect(left);
  try {
    assert.equal((await client.listTools()).tools.length,8);
    const report=await client.callTool({name:'research_creator',arguments:{creator}});
    assert.equal(report.structuredContent.result.identity.state,'matched');
    const bad=await client.callTool({name:'research_creator',arguments:{creator:{profileUrl:'file:///secret'}}});assert.equal(bad.isError,true);
  } finally {await client.close();await server.close();}
});
test('HTTP companion requires exact origin, Host and bearer; enforces bounds and CORS',async()=>{
  let calls=0;const server=createCompanion(config,async()=>{calls++;return {structuredContent:{result:{mode:'expertise'}}};});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}`;
  const headers={Origin:config.extensionOrigin,Authorization:`Bearer ${config.token}`,'Content-Type':'application/json'};
  try {
    const health=await fetch(url+'/v1/health',{method:'POST',headers,body:'{}'});assert.equal(health.status,200);assert.ok((await health.json()).configId);
    for(const changed of [{Origin:'https://evil.example'},{Origin:'null'},{Authorization:'Bearer wrong'}]) {
      assert.equal((await fetch(url+'/v1/research',{method:'POST',headers:{...headers,...changed},body:JSON.stringify({creator})})).status,403);
    }
    const rebinding=await new Promise((resolve,reject)=>{const req=http.request(url+'/v1/health',{method:'POST',headers:{...headers,Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end('{}');});
    assert.equal(rebinding,403);
    assert.equal(calls,0);
    const options=await fetch(url+'/v1/research',{method:'OPTIONS',headers:{Origin:config.extensionOrigin}});assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),config.extensionOrigin);
    assert.equal((await fetch(url+'/v1/research',{method:'POST',headers,body:'x'.repeat(9000)})).status,413);
    assert.equal((await fetch(url+'/v1/research',{method:'POST',headers,body:'{"creator":{}}'})).status,400);
    assert.equal((await fetch(url+'/v1/research',{method:'POST',headers,body:JSON.stringify({creator})})).status,200);assert.equal(calls,1);
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('real stdio child, MCP protocol and local JSON discovery work together',async()=>{
  const upstream=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({results:[]}));});
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const directory=await mkdtemp(join(tmpdir(),'expertseal-fixture-'));const file=join(directory,'config.json');
  await writeFile(file,JSON.stringify({...config,searxng:`http://127.0.0.1:${upstream.address().port}/`}),{mode:0o600});
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../mcp.js',import.meta.url))],env:{EXPERTSEAL_CONFIG:file},stderr:'pipe'});
  const client=new Client({name:'stdio-fixture',version:'1'});
  try {
    await client.connect(transport);
    const response=await client.callTool({name:'research_creator',arguments:{creator}});
    assert.equal(response.structuredContent.result.identity.state,'unresolved');assert.equal(response.structuredContent.result.partial,false);
  } finally {await client.close();upstream.closeAllConnections();await new Promise(r=>upstream.close(r));await rm(directory,{recursive:true,force:true});}
});
