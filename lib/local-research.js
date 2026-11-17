// Only imported by the trusted worker. Token never appears in a report or URL.
const BASE='http://127.0.0.1:3210';
export const LOCAL_PERMISSION={origins:['http://127.0.0.1/*']};
async function call(path,token,body,fetcher=fetch) {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),120000);
  try {
    const response=await fetcher(BASE+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),credentials:'omit',redirect:'error',signal:controller.signal});
    if (!response.ok) throw new Error(response.status===403 ? 'Companion rejected access. Check your token and extension ID in its configuration.' : 'Local companion is busy or unavailable.');
    const reader=response.body.getReader();const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256000){await reader.cancel();throw new Error('Companion report exceeds the size limit.');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const result=JSON.parse(new TextDecoder().decode(bytes));
    if (result.error) throw new Error('Local research could not complete. Check companion services.');
    if(result.protocol!==1 || typeof result.configId!=='string' || result.configId.length>120) throw new Error('Unsupported companion response.');
    return result;
  } catch(error) {
    if (controller.signal.aborted) throw new Error('Local research timed out. No other provider was contacted.');
    if(error instanceof TypeError) throw new Error('Local companion is not reachable. Start it on 127.0.0.1:3210 and enable local access in settings.');
    throw error;
  } finally {clearTimeout(timer);}
}
export const localHealth=(token,fetcher)=>call('/v1/health',token,{},fetcher);
export async function localResearch(token,creator,configId,fetcher) {
  const {platform,username,...input}=creator;
  const result=await call('/v1/research',token,{creator:input},fetcher);
  if(result.configId!==configId) throw new Error('Companion configuration changed. Start this check again.');
  const d=result.data;
  const states=['matched','possible_match','unresolved','conflicting_evidence'];
  if(d?.mode!=='expertise' || !states.includes(d.identity?.state) || !Array.isArray(d.statements) || d.statements.length!==4 ||
    !Array.isArray(d.credentials) || d.credentials.length>200 || !Array.isArray(d.sources) || d.sources.length>20 ||
    !Array.isArray(d.leads) || d.leads.length>30 || !Array.isArray(d.limitations) || d.limitations.length>25 ||
    d.statements.some(s=>typeof s.text!=='string' || s.text.length>180 || !Array.isArray(s.urls) || s.urls.length>20 || s.urls.some(u=>!globalThis.ExpertSealIdentity.safeUrl(u))) ||
    !Array.isArray(d.identity.evidence) || !Array.isArray(d.topic?.credentialIds)) throw new Error('Companion returned an invalid evidence report.');
  return d;
}
