/**
 * Fase 9E: execute with `node scripts/phase9e-validate.mjs`.
 * To add Lighthouse medians (12 runs), pass `--lighthouse`.
 * No source files are modified; evidence is generated in ignored folders.
 */
import {spawnSync,execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const report=path.join(root,'reports','phase9e');
mkdirSync(report,{recursive:true});
const git=(...args)=>{try{return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}catch{return null;}};
const meta={startedAt:new Date().toISOString(),commit:git('rev-parse','HEAD'),branch:git('branch','--show-current'),node:process.version,os:os.platform()+' '+os.release(),stages:{}};
const save=()=>writeFileSync(path.join(report,'validation.json'),JSON.stringify(meta,null,2)+'\n','utf8');
const node=process.execPath;
const npx=process.platform==='win32'?'npx.cmd':'npx';
const npm=process.platform==='win32'?'npm.cmd':'npm';
for(const old of ['functional','visual','public']){
  const target=path.join(report,old+'.json');
  if(existsSync(target))rmSync(target);
}
save();
function step(name,command,args,environment={}){
  console.log(`\n[9E] ===== ${name} =====`);
  // Node é executado diretamente; só .cmd/.bat requer shell no Windows.
  const usesWindowsBatch=process.platform==='win32' && /\.(?:cmd|bat)$/i.test(command);
  const r=spawnSync(command,args,{cwd:root,stdio:'inherit',shell:usesWindowsBatch,env:{...process.env,...environment}});
  const code=r.error?1:(r.status??1);
  meta.stages[name]={code,finishedAt:new Date().toISOString(),command:[command,...args].join(' '),error:r.error?.message??null};save();
  if(code!==0)console.error(`[9E] ${name} falhou (exit ${code}); verifique os logs acima.`);
  return code===0;
}
function finish(){spawnSync(node,['scripts/phase9e-report.mjs'],{cwd:root,stdio:'inherit'});process.exitCode=1;}
if(!step('lint',npm,['run','lint']))finish();
else if(!step('build',npm,['run','build']))finish();
else {
  const tests=[
    ['functional',['playwright','test','--workers=2','--reporter=list,./scripts/phase9e-reporter.mjs'],'functional'],
    ['visual',['playwright','test','--config=playwright.visual.config.ts','--reporter=list,./scripts/phase9e-reporter.mjs'],'visual'],
    ['public',['playwright','test','tests/phase9e-public.spec.ts','--config=playwright.public.config.ts','--reporter=list,./scripts/phase9e-reporter.mjs'],'public']
  ];
  let failed=false;
  for(const [name,args,kind] of tests){if(!step(name,npx,args,{KURIO_EVIDENCE_KIND:kind})){failed=true;break;}}
  if(!failed&&process.argv.includes('--lighthouse')){
    const lhRoot=path.join(root,'lighthouse-reports');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    for(const mode of ['mobile','desktop']){
      const folder=path.join(lhRoot,mode);
      if(existsSync(folder)){
        const backup=path.join(root,`lighthouse-reports-backup-${stamp}-${mode}`);
        renameSync(folder,backup);
        console.log(`[9E] Preservado relatório anterior: ${path.basename(backup)}`);
      }
      if(!step('lighthouse-'+mode,npx,['--no-install','lhci','autorun',`--config=lighthouserc.${mode}.json`])){failed=true;break;}
    }
    if(!failed && !step('lighthouse-summary',node,['scripts/lighthouse-summary.mjs']))failed=true;
  }
  const result=spawnSync(node,['scripts/phase9e-report.mjs'],{cwd:root,stdio:'inherit'});
  if(failed||result.status!==0)process.exitCode=1;
  else if(!['lint','build','functional','visual','public'].every(k=>meta.stages[k]?.code===0))process.exitCode=1;
}
