import http from 'node:http';
import { timingSafeEqual,randomUUID } from 'node:crypto';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { loadConfig,configurationId } from './config.js';
import { requestSchema } from './research.js';

export function authorized(req,config,port) {
  if (req.headers.host!==`127.0.0.1:${port}` || req.headers.origin!==config.extensionOrigin) return false;
  const received=Buffer.from(req.headers.authorization || ''),expected=Buffer.from('Bearer '+config.token);
  return received.length===expected.length && timingSafeEqual(received,expected);
}
async function readBody(req) {
  let size=0;const chunks=[];
  for await (const chunk of req) {size+=chunk.length;if(size>8192) throw new Error('Request too large.');chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
export function createCompanion(config,callTool,{port=3210}={}) {
  let active=0;const recent=[];
  const configId=configurationId(config)+'-'+randomUUID();
  return http.createServer({maxHeaderSize:8192,requestTimeout:10000,headersTimeout:10000},async(req,res)=>{
    const originOK=req.headers.origin===config.extensionOrigin && req.headers.host===`127.0.0.1:${req.socket.localPort}`;
    const finish=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
    if (originOK) {
      res.setHeader('Access-Control-Allow-Origin',config.extensionOrigin);res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network','true');
    }
    if (req.method==='OPTIONS') {res.writeHead(originOK ? 204 : 403);res.end();return;}
    if (!authorized(req,config,req.socket.localPort)) {finish(403,{error:'Local companion access denied.'});return;}
    if (req.method!=='POST' || !['/v1/health','/v1/research'].includes(req.url)) {finish(404,{error:'Unknown route.'});return;}
    if (req.headers['content-type']!=='application/json') {finish(415,{error:'JSON required.'});return;}
    if (Number(req.headers['content-length'] || 0)>8192) {finish(413,{error:'Request too large.'});return;}
    let body;try {body=await readBody(req);} catch {finish(400,{error:'Invalid request.'});return;}
    if (req.url==='/v1/health') {finish(200,{protocol:1,configId,model:config.model});return;}
    const parsed=requestSchema.safeParse(body);
    if (!parsed.success) {finish(400,{error:'Invalid creator input.'});return;}
    while(recent.length && Date.now()-recent[0]>60000) recent.shift();
    if (active>=2 || recent.length>=6) {finish(429,{error:'Companion is busy. Wait before trying again.'});return;}
    recent.push(Date.now());active++;
    // Send headers promptly so a service-worker fetch does not wait for model generation.
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.write(' ');
    const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(' ');},10000);
    try {
      const result=await callTool(parsed.data);
      if (result.isError || !result.structuredContent?.result) throw new Error();
      const output=JSON.stringify({protocol:1,configId,data:result.structuredContent.result});
      if (Buffer.byteLength(output)>256000) throw new Error();
      res.end(output);
    } catch {res.end(JSON.stringify({error:'Local research unavailable. Check SearXNG, Ollama and companion configuration.'}));}
    finally {clearInterval(heartbeat);active--;}
  });
}
export async function start() {
  const config=loadConfig();
  const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('./mcp.js',import.meta.url))],
    env:{EXPERTSEAL_CONFIG:process.env.EXPERTSEAL_CONFIG},stderr:'ignore'});
  const client=new Client({name:'expertseal-loopback-companion',version:'2.0.0-preview.1'});
  await client.connect(transport);
  const server=createCompanion(config,args=>client.callTool({name:'research_creator',arguments:args},{timeout:110000}));
  server.on('error',async()=>{await client.close();process.exitCode=1;});
  server.listen(3210,'127.0.0.1',()=>process.stdout.write('ExpertSeal companion listening on 127.0.0.1:3210.\n'));
  const close=()=>{server.close();client.close().finally(()=>process.exit(0));};
  process.once('SIGINT',close);process.once('SIGTERM',close);
  return {server,client};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) start().catch(()=>{process.stderr.write('Companion startup failed. Check configuration and port availability.\n');process.exitCode=1;});
