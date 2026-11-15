import fs from 'node:fs';
import path from 'node:path';
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
export const files=['manifest.json','background/service-worker.js','content/content.js','lib/identity.js','lib/verification.js','lib/report.js','popup/popup.html','popup/popup.css','popup/popup.js','icons/icon16.png','icons/icon48.png','icons/icon128.png','LICENSE','README.md','PRIVACY.md'];
// ZIP store format: no runtime dependencies, no secrets/dev dependencies in the package.
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
const destination=path.resolve('dist',`expertseal-${manifest.version}`);
fs.mkdirSync(destination,{recursive:true});
const chunks=[],central=[];let offset=0;
for(const name of files){
  const bytes=fs.readFileSync(name), filename=Buffer.from(name),crc=crc32(bytes);
  const target=path.join(destination,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(bytes.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);
  chunks.push(header,filename,bytes);
  const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(bytes.length,20);entry.writeUInt32LE(bytes.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);central.push(entry,filename);offset+=header.length+filename.length+bytes.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const archive=path.resolve('dist',`expertseal-${manifest.version}.zip`);fs.writeFileSync(archive,Buffer.concat([...chunks,directory,end]));
console.log(`Packaged ${files.length} explicitly selected files.\nLoad unpacked: ${destination}\nZIP: ${archive}`);
