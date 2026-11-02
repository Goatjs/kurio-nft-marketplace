import {test,expect} from '@playwright/test';

// A mesma arte de referência recebe quatro enquadramentos diferentes.
// Não são novas obras nem arquivos de imagem inventados.
test('galeria permite alternar e restaurar a visualização em desktop e mobile',async({page})=>{
  await page.goto('/nfts/nft-1');
  await expect(page.locator('.detail-price')).toContainText('1.19 ETH');
  const mobile=test.info().project.name.includes('mobile');
  const choices=page.locator(mobile?'.gallery-mobile-controls':'.detail-thumbs');
  const image=page.locator('.detail-hero .gallery-viewport img');
  await expect(choices.getByRole('button',{name:'Arte completa'})).toHaveAttribute('aria-pressed','true');
  await choices.getByRole('button',{name:'Detalhe central'}).click();
  await expect(choices.getByRole('button',{name:'Detalhe central'})).toHaveAttribute('aria-pressed','true');
  await expect(image).toHaveClass(/gallery-view-center/);
  await expect.poll(async()=>image.evaluate(el=>getComputedStyle(el).transform)).not.toBe('none');
  await choices.getByRole('button',{name:'Detalhe inferior'}).click();
  await expect(image).toHaveClass(/gallery-view-lower/);
  await choices.getByRole('button',{name:'Arte completa'}).click();
  await expect(image).toHaveClass(/gallery-view-full/);
});
