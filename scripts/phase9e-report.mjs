/** Build a factual, reproducible hand-off report from evidence on disk. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const folder=path.join(root,'reports','phase9e');
mkdirSync(folder,{recursive:true});
const get=(file)=>{try{return JSON.parse(readFileSync(file,'utf8'));}catch{return null;}};
const git=(...args)=>{try{return execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();}catch{return 'desconhecido';}};
const state=get(path.join(folder,'validation.json'));
const stages=state?.stages||{};
const kinds=['functional','visual','public'];
const reports=Object.fromEntries(kinds.map(kind=>[kind,get(path.join(folder,kind+'.json'))]));
const lighthouse=get(path.join(root,'lighthouse-reports','RESUMO-LIGHTHOUSE.json'));
const commit=git('rev-parse','HEAD'),branch=git('branch','--show-current');
const stageRows=['lint','build','functional','visual','public','lighthouse-mobile','lighthouse-desktop','lighthouse-summary'].map(name=>{
  const s=stages[name];
  return `| ${name} | ${!s?'Não executado':s.code===0?'Aprovado':'Falhou'} | ${s?.finishedAt||'—'} |`;
});
const rows=kinds.map(kind=>{
  const r=reports[kind];
  return `| ${kind} | ${r?.result??'Sem evidência'} | ${r?.counts?.passed??'—'} | ${r?.counts?.skipped??'—'} | ${r?.counts?.failed??'—'} | ${r?.counts?.timedOut??'—'} | ${r?.planned??'—'} |`;
});
const mandatory=['lint','build','functional','visual','public'];
const mandatoryOk=mandatory.every(k=>stages[k]?.code===0) && kinds.every(k=>reports[k]?.result==='passed' && reports[k].commit===commit && reports[k].observed===reports[k].planned);
const auditsOk=['lighthouse-mobile','lighthouse-desktop','lighthouse-summary'].every(k=>stages[k]?.code===0) && lighthouse?.complete===true;
const summary={generatedAt:new Date().toISOString(),commit,branch,mandatoryOk,auditsOk,manualFigmaReview:'pendente',steps:stages,playwright:Object.fromEntries(kinds.map(k=>[k,reports[k]?{result:reports[k].result,counts:reports[k].counts,commit:reports[k].commit}:null])),lighthouse:lighthouse?{complete:lighthouse.complete,rows:lighthouse.rows?.map(r=>({profile:r.profile,page:r.page,runs:r.runs,grades:r.grades,lcpMs:r.lcpMs,cls:r.cls,tbtMs:r.tbtMs}))}:null};
const lines=[
  '# Kurio — evidências de entrega (Fase 9E)', '',
  `- Gerado em: ${summary.generatedAt}`,
  `- Branch: \`${branch}\``,
  `- Commit local: \`${commit}\``,
  `- Testes de build/lint/E2E: **${mandatoryOk?'aprovados para este commit':'pendentes ou incompletos'}**`,
  `- Lighthouse: **${auditsOk?'relatórios completos':'pendente/incompleto'}**`,
  '- Fidelidade visual ao Figma: **revisão humana pendente**, a menos que exista aprovação separada documentada.',
  '', '## Etapas executadas', '',
  '| Etapa | Resultado | Finalizada em |','|---|---|---|',...stageRows,
  '', '## Playwright', '',
  '| Grupo | Resultado | Passed | Skipped | Failed | Timed out | Planejados |',
  '|---|---|---:|---:|---:|---:|---:|',...rows,
  '', '## Auditoria Lighthouse', '',
  lighthouse?.complete===true?'Dados em `lighthouse-reports/RESUMO-LIGHTHOUSE.md` e `.json`.':'Sem resumo Lighthouse completo desta execução. Execute `node scripts/phase9e-validate.mjs --lighthouse` para obter a medição.',
  '', '## Observações e limitações', '',
  '- Backend, autenticação, pagamentos, carteiras e blockchain continuam simulados com MSW.',
  '- Teste no domínio público e estado de deploy podem mudar após esta geração; confirmar a Vercel e o endereço atual.',
  '- Snapshots Playwright validados são testes contra baseline local, não comparação automática com Figma.',
  '- Antes de considerar a entrega final, registre revisão visual manual, deploy verde e resultados para o commit integrado.',
  '- Relatórios locais e arquivos de sessão/demonstração nunca devem ser enviados ao repositório.',
  ''
];
writeFileSync(path.join(folder,'ENTREGA-FINAL.md'),lines.join('\n'),'utf8');
writeFileSync(path.join(folder,'ENTREGA-FINAL.json'),JSON.stringify(summary,null,2)+'\n','utf8');
console.log('[9E] Relatório: reports/phase9e/ENTREGA-FINAL.md');
console.log(`[9E] Estado: testes ${mandatoryOk?'OK':'INCOMPLETOS'} / Lighthouse ${auditsOk?'OK':'PENDENTE'} / Figma MANUAL PENDENTE`);
