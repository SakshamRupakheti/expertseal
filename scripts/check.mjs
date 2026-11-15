import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const paths=[manifest.background.service_worker,manifest.action.default_popup,manifest.options_ui.page,...Object.values(manifest.icons),...manifest.content_scripts.flatMap(s=>[...s.js,...(s.css||[])])];
for(const file of paths)if(!fs.existsSync(file))throw new Error(`Missing manifest asset: ${file}`);
const files=['background/service-worker.js','content/content.js','lib/identity.js','lib/verification.js','lib/report.js','popup/popup.js'];
for(const file of files)execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
if(manifest.permissions.join(',')!=='storage')throw new Error('Review unexpected permissions');
console.log(`PASS: manifest assets and ${files.length} runtime JavaScript syntax checks.`);
