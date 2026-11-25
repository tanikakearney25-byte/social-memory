// Local navigation diagnostics only: no post bodies, cookies or browser storage.
export function readThreadsNavigationDiagnostics() {
  const navigation = [...document.querySelectorAll('a[href], [role="link"], [role="navigation"] button')]
    .filter(node => node.getClientRects().length > 0)
    .slice(0, 45).map(node => ({
      tag: node.tagName,
      href: (node.getAttribute('href') || '').split(/[?#]/)[0].slice(0, 180),
      label: (node.getAttribute('aria-label') || '').slice(0, 100),
      svgLabel: (node.querySelector('svg')?.getAttribute('aria-label') || '').slice(0, 100),
      svgTitle: (node.querySelector('svg title')?.textContent || '').slice(0, 100),
      title: (node.getAttribute('title') || '').slice(0, 100),
      text: node.querySelector('svg') ? (node.textContent || '').trim().slice(0, 100) : '',
    }));
  const posts=[...document.querySelectorAll('a[href*="/post/"]')];
  const postStructure=posts.slice(0,5).map(link=>{
    const ancestors=[];
    for(let node=link,depth=0;node&&depth<10;node=node.parentElement,depth++) {
      ancestors.push({tag:node.tagName,role:node.getAttribute('role'),testId:node.getAttribute('data-testid'),postLinks:node.querySelectorAll('a[href*="/post/"]').length,times:node.querySelectorAll('time').length});
    }
    return {href:link.getAttribute('href')?.split(/[?#]/)[0],ancestors};
  });
  const headings=[...document.querySelectorAll('h1,h2,[role="heading"],[role="tab"],a[aria-label="列标题"],a[aria-label="Column header"]')].slice(0,30).map(node=>({tag:node.tagName,label:node.getAttribute('aria-label'),text:(node.textContent||'').trim().slice(0,120),selected:node.getAttribute('aria-selected'),visible:node.getClientRects().length>0}));
  return {origin:location.origin, path:location.pathname, headings,navigation,postLinkCount:posts.length,articleCount:document.querySelectorAll('article,[role="article"]').length,postStructure};
}
