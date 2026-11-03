import {expect,test} from '@playwright/test';

/** Fase 9D: navegação assistiva, reflow e preferências de movimento. */
test('pesquisa desktop ou filtros mobile: estado, Escape e foco',async({page},info)=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/SEJA DONO (?:DO FUTURO|DA CULTURA DIGITAL)/})).toBeVisible();
  if(info.project.name.includes('mobile')){
    const toggle=page.getByRole('button',{name:'Abrir filtros'});
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    await expect(toggle).toHaveAttribute('aria-controls','mobile-filter-panel');
    const panel=page.getByRole('region',{name:'Filtros do catálogo'});
    await expect(panel).toBeVisible();
    await panel.getByRole('searchbox',{name:'Buscar NFT'}).press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(toggle).toBeFocused();
  }else{
    const toggle=page.getByRole('button',{name:'Pesquisar NFTs'});
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    const search=page.getByRole('search',{name:'Busca rápida de NFTs'});
    await expect(search).toBeVisible();
    await search.getByRole('searchbox',{name:'Pesquisar no catálogo'}).press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await expect(toggle).toBeFocused();
  }
});

test('abas do NFT e navegação de galeria têm seleção acessível',async({page},info)=>{
  await page.goto('/nfts/nft-1');
  await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();
  if(info.project.name.includes('mobile')){
    const controls=page.locator('.gallery-mobile-controls');
    const full=controls.getByRole('button',{name:'Arte completa'});
    const center=controls.getByRole('button',{name:'Detalhe central'});
    await expect(full).toHaveAttribute('aria-pressed','true');
    await center.click();
    await expect(center).toHaveAttribute('aria-pressed','true');
    await expect(full).toHaveAttribute('aria-pressed','false');
  }else{
    const tabs=page.getByRole('tablist',{name:'Informações do NFT'});
    const details=tabs.getByRole('tab',{name:'Detalhes do NFT'});
    const reviews=tabs.getByRole('tab',{name:/Avaliações de colecionadores/});
    await expect(details).toHaveAttribute('aria-selected','true');
    await details.focus();
    await details.press('ArrowRight');
    await expect(reviews).toHaveAttribute('aria-selected','true');
    await expect(reviews).toBeFocused();
    await expect(page.getByRole('tabpanel')).toContainText('As avaliações demonstrativas');
    await reviews.press('Home');
    await expect(details).toHaveAttribute('aria-selected','true');
    await expect(details).toBeFocused();
  }
});

test('reflow responsivo não cria rolagem horizontal nas telas-chave',async({page},info)=>{
  const viewports=info.project.name.includes('mobile')
    ?[{width:320,height:740},{width:390,height:844}]
    :[{width:768,height:1024},{width:1440,height:900}];
  for(const viewport of viewports){
    await page.setViewportSize(viewport);
    for(const route of ['/','/nfts/nft-1','/cart','/login']){
      await page.goto(route);
      await expect(page.locator('main#conteudo-principal')).toBeVisible();
      // O documento nunca deve ficar mais largo que o viewport.
      const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      expect(dimensions.scrollWidth,`${route} em ${viewport.width}px: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport+2);
    }
  }
});

test('preferência de movimento reduzido desativa rolagem suave',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('main#conteudo-principal')).toBeVisible();
  const behavior=await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior);
  expect(behavior).toBe('auto');
});
