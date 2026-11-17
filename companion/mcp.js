import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { ResearchEngine, requestSchema } from './research.js';
import { loadConfig } from './config.js';
import * as schemas from './schemas.js';
export function createResearchServer(config, dependencies) {
  const engine=new ResearchEngine(config,dependencies);
  const server=new McpServer({name:'expertseal-creator-research',version:'2.0.0-preview.1'});
  const session=z.object({researchId:z.string().uuid()}).strict();
  const outputSchemas={public_profile_discovery:z.object({researchId:z.string().uuid(),leads:z.array(schemas.lead).max(6)}),academic_record_discovery:z.object({leads:z.array(schemas.lead).max(30)}),professional_experience_discovery:z.object({leads:z.array(schemas.lead).max(30)}),identity_matching:schemas.identity,credential_extraction:z.object({credentials:z.array(schemas.credential).max(80)}),topic_relevance:schemas.topic,evidence_summary:schemas.report,research_creator:schemas.report};
  const register=(name,description,inputSchema,run)=>server.registerTool(name,{description,inputSchema,
    outputSchema:z.object({result:outputSchemas[name]}),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}},async args=>{
    try {const result=await run(args);return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:{result}};}
    catch {return {isError:true,content:[{type:'text',text:'Research could not complete. Check configuration or start a new research session.'}]};}
  });
  register('public_profile_discovery','Begin bounded public profile discovery. Results are unverified leads.',requestSchema,({creator})=>engine.discover(creator));
  register('academic_record_discovery','Discover OpenAlex, ORCID and education leads for this session.',session,({researchId})=>engine.academic(researchId));
  register('professional_experience_discovery','Discover employer and professional leads, without attributing name matches.',session,({researchId})=>engine.professional(researchId));
  register('identity_matching','Fetch approved sources and require a source-scoped direct account link.',session,({researchId})=>engine.match(researchId));
  register('credential_extraction','Extract structured facts and scoped biography quotations with provenance and identity evidence.',session,({researchId})=>engine.extract(researchId));
  register('topic_relevance','Evaluate conservative documented field overlap with the explicitly supplied subject.',session,({researchId})=>engine.relevance(researchId));
  register('evidence_summary','Return four validated extractive statements; deterministic fallback on model failure.',session,({researchId})=>engine.summarize(researchId));
  register('research_creator','Run the complete evidence pipeline. No paid fallback or popularity input.',requestSchema,({creator})=>engine.research(creator));
  return server;
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {await createResearchServer(loadConfig()).connect(new StdioServerTransport());}
  catch {process.stderr.write('ExpertSeal MCP startup failed. Check private configuration.\n');process.exitCode=1;}
}
