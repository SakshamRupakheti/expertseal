import {configSchema} from '../config.js';
export const config=configSchema.parse({extensionOrigin:'chrome-extension://'+'a'.repeat(32),token:'synthetic-test-token-do-not-use-123456',openalex:false,model:'none',sourceOrigins:[{origin:'https://college.example',type:'institutional'}]});
export const creator={profileUrl:'https://x.com/avery_fixture',displayName:'Avery Reed',subject:'mechanical engineering'};
export function source(overrides={},sourceType='institutional') {
  const person={'@type':'Person','@id':'#person',name:'Avery Reed',sameAs:[creator.profileUrl],jobTitle:'Mechanical engineering researcher',worksFor:{name:'Example Research Lab'},hasCredential:{name:'BSc Mechanical engineering',recognizedBy:{name:'Example College'},competencyRequired:'mechanical engineering'},...overrides};
  return {url:'https://college.example/people/avery',sourceType,retrievedAt:'2026-11-17T00:00:00Z',html:`<title>Public biography fixture</title><script type="application/ld+json">${JSON.stringify(person)}</script>`};
}
