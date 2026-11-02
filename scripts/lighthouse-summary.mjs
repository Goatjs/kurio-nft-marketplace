import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const reportRoot = path.join(root, 'lighthouse-reports');
const expectations = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
};
const paths = {'/': 'Início', '/nfts/nft-1': 'Detalhe do NFT'};
const med = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};
const display = (v, suffix = '', digits = 0) =>
  v === null || !Number.isFinite(v) ? 'N/D' : `${v.toFixed(digits)}${suffix}`;
const safeNum = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const medianOf = (arr, fn) => med(arr.map(fn).filter(v => v !== null));
const escapeCell = s => String(s).replaceAll('|','\\|').replaceAll('\n',' ');
const md = [
  '# Kurio — Lighthouse: medianas de 3 execuções',
  '',
  'As métricas são calculadas a partir dos relatórios Lighthouse **reais**, gerados com o build de produção e os mocks ativados.',
  '',
  '| Perfil | Página | Execuções | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
];
const rawRows = [];
let invalid = false;
for (const profile of ['mobile', 'desktop']) {
  const folder = path.join(reportRoot, profile);
  if (!fs.existsSync(folder)) {
    console.error(`Pasta não encontrada: ${folder}`);
    invalid = true;
    continue;
  }
  const files = fs.readdirSync(folder).filter(name => name.endsWith('.report.json'));
  const all = files.map(name => {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(folder, name),'utf8'));
      const url = json.finalDisplayedUrl || json.finalUrl || json.requestedUrl;
      const pathname = new URL(url).pathname.replace(/\/$/, '') || '/';
      return {name, json, pathname};
    } catch (error) {
      console.error(`Relatório inválido: ${name}: ${error.message}`);
      invalid = true;
      return null;
    }
  }).filter(Boolean);
  for (const [pathname, label] of Object.entries(paths)) {
    const runs = all.filter(r=>r.pathname===pathname);
    if (runs.length !== 3) {
      console.error(`Esperadas exatamente 3 medições em ${profile} ${pathname}; encontradas: ${runs.length}. Limpe '${folder}' antes de repetir uma auditoria.`);
      invalid = true;
    }
    for (const run of runs) {
      const runtimeError = run.json.runtimeError;
      if (runtimeError) {
        console.error(`Erro Lighthouse em ${profile} ${label}: ${JSON.stringify(runtimeError)}`);
        invalid = true;
      }
    }
    const cat = category => medianOf(runs, r => {
      const value = safeNum(r.json.categories?.[category]?.score);
      return value===null ? null : value*100;
    });
    const metric = metricName => medianOf(runs, r=>safeNum(r.json.audits?.[metricName]?.numericValue));
    const grades = Object.fromEntries(Object.keys(expectations).map(key=>[key,cat(key)]));
    const lcp = metric('largest-contentful-paint');
    const cls = metric('cumulative-layout-shift');
    const tbt = metric('total-blocking-time');
    const data = {profile,page:label,pathname,runs:runs.length,grades,lcpMs:lcp,cls,tbtMs:tbt,files:runs.map(r=>r.name),lighthouseVersion:runs[0]?.json.lighthouseVersion??null, userAgent:runs[0]?.json.environment?.hostUserAgent??null};
    rawRows.push(data);
    const gradeText=Object.entries(expectations).map(([key,target])=>{
      const value=grades[key];
      return value===null ? 'N/D' : `${display(value)} ${value < target?'⚠️':'✓'}`;
    });
    md.push(`| ${profile} | ${label} | ${runs.length} | ${gradeText.join(' | ')} | ${display(lcp,' ms')} | ${display(cls,'',3)} | ${display(tbt,' ms')} |`);
  }
}
md.push('', '## Metas', '', '- Performance ≥90; Accessibility ≥95; Best Practices ≥95; SEO ≥90.', '- LCP, CLS e TBT são medianas independentes das 3 medições de cada perfil/página.', '- ⚠️ = abaixo da meta. N/D = dado ausente (não interprete como aprovação).', '', '## Condições da auditoria', '', '- Alvo: `npm run build` + `npm run preview` na porta 4175, com o mesmo frontend e assets usados na entrega.', '- Dados: cenário padrão de mocks MSW; o service worker deve estar ativado no build.', '- Perfis Lighthouse: mobile padrão e desktop com `preset: desktop`; execução em Chrome local.', '- Utilize os arquivos HTML e JSON em `lighthouse-reports/<perfil>/` como evidência.', '- Registrar Windows/versão do Chrome e quaisquer diferenças entre máquinas antes de comparar pontuações.', '');
for (const row of rawRows) md.push(`- **${row.profile} / ${row.page}** — Lighthouse ${escapeCell(row.lighthouseVersion??'N/D')}; Chrome/UA: ${escapeCell(row.userAgent??'N/D')}`);
md.push('', '## Interpretação', '', 'Pontuações variam conforme hardware, Chrome e condições da máquina. Se alguma categoria ficar abaixo da meta, abra o HTML correspondente e anote os diagnósticos antes de alterar o código.');
if (!fs.existsSync(reportRoot)) fs.mkdirSync(reportRoot, {recursive:true});
const mdFile=path.join(reportRoot,'RESUMO-LIGHTHOUSE.md');
fs.writeFileSync(mdFile, md.join('\n')+'\n');
fs.writeFileSync(path.join(reportRoot,'RESUMO-LIGHTHOUSE.json'),JSON.stringify({createdAt:new Date().toISOString(),rows:rawRows,complete:!invalid},null,2)+'\n');
console.log(md.join('\n'));
console.log(`\nResumo salvo em: ${mdFile}`);
if (invalid) process.exitCode=1;
