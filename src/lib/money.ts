/** Keep ETH as decimal strings on the wire; calculate in wei using bigint. */
export function toWei(eth: string): bigint {
 if (!/^\d+(?:\.\d{1,18})?$/.test(eth)) throw new Error('Valor ETH inválido');
 const [whole, fractional=''] = eth.split('.');
 return BigInt(whole)*10n**18n + BigInt(fractional.padEnd(18,'0'));
}
export function fromWei(wei: bigint): string {
 const neg=wei<0n; const v=neg?-wei:wei;
 const fraction=(v%10n**18n).toString().padStart(18,'0').replace(/0+$/,'');
 return `${neg?'-':''}${v/10n**18n}${fraction?'.'+fraction:''}`;
}
export function addEth(a:string,b:string){return fromWei(toWei(a)+toWei(b));}
export function mulEth(price:string,qty:number){return fromWei(toWei(price)*BigInt(qty));}
export function formatEth(value:string){const [a,b]=value.split('.');const formatted=a.replace(/\B(?=(\d{3})+(?!\d))/g,',');return `${formatted}${b?'.'+b:''} ETH`;}
