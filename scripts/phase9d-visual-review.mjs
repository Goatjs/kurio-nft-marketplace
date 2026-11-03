/**
 * Review visual: referencias-figma (8 imagens) versus snapshots Playwright.
 * Este relatório não reescreve as capturas e não aprova fidelidade automaticamente.
 * Execute: node scripts/phase9d-visual-review.mjs
 */
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const views=[
  ['Início','inicio','inicio'],
  ['Detalhe do NFT','detalhe','detalhe-nft'],
  ['Carrinho','carrinho','carrinho'],
  ['Pagamento','pagamento','pagamento']
];
const modes=[['Mobile (390 px)','mobile','mobile-390'],['Desktop (1440 px)','desktop','desktop-1440']];
const pairs=views.flatMap(([name,reference,snapshot])=>modes.map(([mode,suffix,project])=>({
  title:`${name} — ${mode}`,
  reference:`referencias-figma/${reference}-${suffix}.png`,
  snapshot:`visual-tests/visual-regression.spec.ts-snapshots/${snapshot}-visual-${project}-win32.png`
})));
const missing=pairs.flatMap(p=>[p.reference,p.snapshot].filter(f=>!existsSync(path.join(root,f))));
if(missing.length){console.error('[Fase 9D] Imagens ausentes:\n'+missing.join('\n'));process.exitCode=1;}
else{
  const enc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const relative=f=>'../'+f.split('/').map(encodeURIComponent).join('/');
  const sections=pairs.map((p,i)=>`<section class="pair" id="pair-${i}">
    <h2>${i+1}. ${enc(p.title)}</h2>
    <div class="compare-grid">
      <figure><figcaption>Referência Figma</figcaption><img loading="lazy" src="${relative(p.reference)}" alt="Referência de ${enc(p.title)}"></figure>
      <figure><figcaption>Baseline Playwright (Windows)</figcaption><img loading="lazy" src="${relative(p.snapshot)}" alt="Captura atual de ${enc(p.title)}"></figure>
    </div>
    <div class="overlay-wrap">
      <label for="slider-${i}">Sobreposição qualitativa: <output id="value-${i}">50%</output></label>
      <input id="slider-${i}" type="range" min="0" max="100" value="50" data-target="overlay-${i}" data-output="value-${i}">
      <div class="overlay" id="overlay-${i}" style="--reveal:50%">
        <img src="${relative(p.reference)}" alt="" loading="lazy">
        <img class="top" src="${relative(p.snapshot)}" alt="" loading="lazy">
      </div>
      <p class="fine">As proporções e alturas das imagens podem ser diferentes. A sobreposição é visual, não uma métrica automática pixel a pixel.</p>
    </div>
  </section>`).join('\n');
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kurio — revisão de fidelidade visual · Fase 9D</title><style>
  :root{color-scheme:dark;font:14px system-ui,Arial;background:#130d0b;color:#f4ebe4}*{box-sizing:border-box}body{margin:0}header{padding:28px max(20px,calc((100vw - 1160px)/2));background:#291911;border-bottom:2px solid #cf894d}h1{margin:0 0 8px;font-size:24px}p{line-height:1.65}a{color:#edb278}main{max-width:1180px;margin:auto;padding:24px 16px 64px}.intro{max-width:850px}.pairs-nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 26px}.pairs-nav a{border:1px solid #785039;border-radius:30px;padding:8px 12px;text-decoration:none}.pair{padding:20px 0 36px;border-top:1px solid #6b4334}.pair h2{font-size:20px}.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.compare-grid figure{margin:0;min-width:0;background:#261711;padding:12px;border-radius:8px}.compare-grid figcaption{font-weight:700;color:#f3ad77;margin-bottom:10px}.compare-grid img{width:100%;height:auto;display:block;object-fit:contain}.overlay-wrap{max-width:680px;margin:18px auto}.overlay-wrap>label{display:block;margin-bottom:8px}.overlay-wrap input{width:100%;accent-color:#cf894d}.overlay{position:relative;line-height:0;border:1px solid #86543b;background:#22150e;overflow:hidden}.overlay img{display:block;width:100%;height:auto}.overlay img.top{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--reveal)) 0 0)}.fine{font-size:12px;color:#c8a784}.note{background:#281b15;border-left:3px solid #cf894d;padding:12px 16px}@media(max-width:700px){.compare-grid{grid-template-columns:1fr}header{padding:24px 16px}h1{font-size:22px}}
  </style></head><body><header><h1>Kurio · revisão visual da Fase 9D</h1><p>8 referências locais do Figma × 8 snapshots aprovados do Playwright.</p></header><main><div class="intro"><p class="note">Esta página permite comparar geometrias, tipografia, espaçamentos, cores e recortes. Capturas Playwright reproduzíveis não comprovam, por si, fidelidade ao Figma. Não atualize snapshots para esconder diferenças sem aprovação visual.</p><p>Para novas capturas, rode <code>npx playwright test --config=playwright.visual.config.ts</code> antes de abrir este relatório. Imagens servidas via caminhos locais do repositório.</p></div><nav class="pairs-nav" aria-label="Seções">${pairs.map((p,i)=>`<a href="#pair-${i}">${enc(p.title)}</a>`).join('')}</nav>${sections}<p>Revisão manual: consulte <code>docs/FASE9D-REVISAO-VISUAL.md</code> e registre discrepâncias reais, sem presumir correspondência pixel-a-pixel.</p></main><script>document.querySelectorAll('input[data-target]').forEach(slider=>{slider.addEventListener('input',()=>{document.getElementById(slider.dataset.target).style.setProperty('--reveal',slider.value+'%');document.getElementById(slider.dataset.output).textContent=slider.value+'%'})});</script></body></html>`;
  const dir=path.join(root,'reports');mkdirSync(dir,{recursive:true});const target=path.join(dir,'fase9d-revisao-figma.html');writeFileSync(target,html,'utf8');
  console.log('[Fase 9D] Relatório criado: '+path.relative(root,target));
  console.log('[Fase 9D] Abra o arquivo HTML localmente no navegador. Não faça commit do relatório gerado.');
}
