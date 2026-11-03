/** Persist Playwright evidence without changing existing project configs. */
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const output=path.join(root,'reports','phase9e');
const kind=process.env.KURIO_EVIDENCE_KIND || 'unspecified';
const git=(...args)=>{try{return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}catch{return null;}};

export default class KurioEvidenceReporter {
  constructor(){this.entries=[];this.planned=0;this.startedAt=new Date().toISOString();}
  printsToStdio(){return false;}
  onBegin(_config,suite){this.planned=suite.allTests().length;}
  onTestEnd(test,result){
    this.entries.push({
      project:test.titlePath()[1] ?? 'unknown',
      file:path.relative(root,test.location.file).replaceAll('\\','/'),
      title:test.title,
      status:result.status,
      retry:result.retry,
      durationMs:result.duration,
      error:result.error?.message?.slice(0,2000) ?? null
    });
  }
  onEnd(result){
    const counts={passed:0,failed:0,skipped:0,timedOut:0,interrupted:0};
    for(const r of this.entries){
      if(r.status==='timedOut')counts.timedOut++;
      else if(r.status in counts)counts[r.status]++;
      else counts.failed++;
    }
    mkdirSync(output,{recursive:true});
    const data={
      kind,startedAt:this.startedAt,finishedAt:new Date().toISOString(),
      commit:git('rev-parse','HEAD'),branch:git('branch','--show-current'),
      result:result.status,planned:this.planned,observed:this.entries.length,
      counts,tests:this.entries
    };
    writeFileSync(path.join(output,`${kind}.json`),JSON.stringify(data,null,2)+'\n','utf8');
    console.log(`[9E] Evidência ${kind}: ${data.result}, ${counts.passed} aprovados, ${counts.skipped} ignorados, ${counts.failed+counts.timedOut+counts.interrupted} falhas`);
  }
}
