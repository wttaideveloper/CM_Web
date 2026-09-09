const fs=require('fs');
const path=require('path');

const serviceFile='packages/features/enterprise-trainings/src/trainings.service.ts';
const serviceTxt=fs.readFileSync(serviceFile,'utf8');

const exported=[];
const reExport=/export\s+(?:async\s+)?function\s+(\w+)|export\s+(?:async\s+)?function\s+\w+\s*\(/g;
let m;
while((m=reExport.exec(serviceTxt))!==null){
  const name=serviceTxt.slice(m.index,m.index+200).match(/export\s+(?:async\s+)?function\s+(\w+)/);
  if(name) exported.push(name[1]);
}
const exportedSet=new Set(exported);

function walkDir(dir){
  let results=[];
  let entries;
  try{ entries=fs.readdirSync(dir,{withFileTypes:true}); }catch(e){return results;}
  for(const ent of entries){
    const full=dir+'/'+ent.name;
    if(ent.isDirectory() && !ent.name.startsWith('.') && ent.name!=='node_modules' && ent.name!=='.next' && ent.name!=='.freebuff') results=results.concat(walkDir(full));
    else if(ent.isFile() && (ent.name.endsWith('.ts')||ent.name.endsWith('.tsx'))) results.push(full);
  }
  return results;
}

const rootDirs=['apps','packages'];
function isRelevant(p){return rootDirs.some(r=>p.startsWith(r+'/'));}
let files=walkDir('.');
files=files.filter(isRelevant).filter(f=>!f.includes('node_modules') && !f.includes('/.next/') && !f.includes('/.freebuff/') && f!==serviceFile);

let scanned=0;
const usage={};
for(const fn of exported){
  usage[fn]=[];
}
for(const f of files){
  if(scanned++>6000) break;
  let txt='';
  try{ txt=fs.readFileSync(f,'utf8'); }catch(e){ continue; }
  for(const fn of exported){
    if(txt.includes(fn)) usage[fn].push(f.replace(/^.*[\/\\]/,''));
  }
}

console.log('service function => UI files using it (count)');
for(const fn of exported){
  console.log(usage[fn].length, fn);
}
const used=Object.values(usage).filter(a=>a.length>0).length;
console.log('---');
console.log('with UI usage:', used, '/', exported.length);
console.log('service-only (no UI files):');
for(const fn of exported) if(usage[fn].length===0) console.log(' -', fn);
console.log('---');
console.log('sample UI files for first 25 used functions:');
let shown=0;
for(const fn of exported){
  if(usage[fn].length>0 && shown<25){
    console.log(fn, '->', usage[fn].slice(0,5).join(' | '));
    shown++;
  }
}
