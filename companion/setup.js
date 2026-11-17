import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {newToken,configSchema} from './config.js';
const extensionId=process.argv[2];
if (!/^[a-p]{32}$/.test(extensionId || '')) throw new Error('Usage: node setup.js YOUR_EXTENSION_ID');
const config=configSchema.parse({extensionOrigin:`chrome-extension://${extensionId}`,token:newToken()});
const path=resolve('config.local.json');
writeFileSync(path,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Created private configuration: '+path+'\nCopy its token directly into ExpertSeal settings. Do not publish this file.');
