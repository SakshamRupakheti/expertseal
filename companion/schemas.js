import {z} from 'zod';
const text=z.string().max(300), url=z.string().url().max(2048);
export const lead=z.object({url,title:text,excerpt:z.string().max(500),sourceType:text,status:z.literal('unverified_lead')}).strict();
const identityLink=z.object({sourceUrl:url,recordId:text,relation:z.literal('record_links_exact_account'),account:url,recordPath:text,sourceType:text}).strict();
export const identity=z.object({state:z.enum(['matched','possible_match','unresolved','conflicting_evidence']),recordIds:z.array(text).max(100),evidence:z.array(identityLink).max(100),explanation:text}).strict();
export const credential=z.object({id:text,type:z.enum(['education','experience','publication']),title:text,institution:text,field:text,start:text,end:text,originalWork:z.boolean().optional(),
  evidenceKind:z.literal('biography_quote').optional(),quote:z.string().min(20).max(380).optional(),
  url,sourceType:z.enum(['institutional','self_reported','original_work']),recordId:text,recordPath:text,identityEvidence:z.array(identityLink).max(100),
  status:z.enum(['institutionally_supported','source_supported','self_reported','unverified_lead','conflicting'])}).strict();
export const topic=z.object({state:z.enum(['documented_overlap','insufficient_evidence']),credentialIds:z.array(text).max(80),explanation:text,subject:text,hint:text,origin:z.enum(['user_supplied','unselected'])}).strict();
export const report=z.object({mode:z.literal('expertise'),status:z.literal('inconclusive'),name:text,identity,topic,summaryMode:z.enum(['deterministic','deterministic_fallback','ollama_validated']),model:z.string().max(40),
  statements:z.array(z.object({id:z.enum(['identity','education','experience','topic']),text:z.string().max(180),urls:z.array(url).max(20)}).strict()).length(4),summary:z.string().max(800),
  credentials:z.array(credential).max(80),sources:z.array(z.object({url,title:text,sourceType:text,retrievedAt:text}).strict()).max(20),leads:z.array(lead).max(24),limitations:z.array(text).max(25),partial:z.boolean()}).strict();
