export function readThreadsIdentityDocument() {
  const profileNames = new Set(['프로필', 'Profile', '个人主页', '个人资料', '個人檔案', '個人主頁', '個人資料']);
  const link = [...document.querySelectorAll('a[href^="/@"]')].find((candidate) => {
    const names = [candidate.getAttribute('aria-label'), candidate.querySelector('svg')?.getAttribute('aria-label'), candidate.querySelector('svg title')?.textContent, candidate.textContent];
    return names.some(name => profileNames.has((name || '').trim()));
  });
  const href = link?.getAttribute('href');
  const handle = href?.match(/^\/@([^/?#]+)/)?.[1] ?? null;
  return {
    handle,
    profileUrl: href ? new URL(href, location.origin).href : null,
  };
}

export function readThreadsPostsDocument() {
  const authenticated = [...document.querySelectorAll('a[href^="/@"]')].some(link =>
    [link.getAttribute('aria-label'), link.querySelector('svg')?.getAttribute('aria-label'), link.querySelector('svg title')?.textContent, link.textContent].some(name =>
      ['프로필', 'Profile', '个人主页', '个人资料', '個人檔案', '個人主頁', '個人資料'].includes((name || '').trim())));
  const empty = [...document.querySelectorAll('[role="status"]')].some(node =>
    /^(저장한 게시물이 여기에 표시됩니다|saved posts will appear here)[.!]?$/i.test(node.textContent.trim()));
  const items = [];
  const seen = new Set();
  for (const link of document.querySelectorAll('a[href*="/post/"]')) {
    const sourceUrl = new URL(link.getAttribute('href'), location.origin).href;
    const match = sourceUrl.match(/threads\.com\/@([^/]+)\/post\/([^/?#]+)/);
    if (!match || seen.has(match[2])) continue;
    let container = link.closest('[role="article"], article');
    if (!container) {
      // Current Threads uses DIV cards. Require one post identity, its author,
      // and a timestamp; never climb into a neighbouring post or page chrome.
      for (let node=link.parentElement,depth=0; node && depth<24; node=node.parentElement,depth++) {
        if (['BODY','HTML','MAIN','NAV','HEADER'].includes(node.tagName) || ['main','navigation'].includes(node.getAttribute('role')) || node.querySelector('nav,[role="navigation"]')) break;
        const ids=new Set([...node.querySelectorAll('a[href*="/post/"]')].map(a=>a.getAttribute('href')?.match(/\/@[^/]+\/post\/([^/?#]+)/)?.[1]).filter(Boolean));
        if (ids.size>1 || node.querySelectorAll('time').length>1) break;
        const author=[...node.querySelectorAll('a[href]')].some(a=> {
          try {return new URL(a.getAttribute('href'),location.origin).pathname.replace(/\/$/,'')===`/@${match[1]}`;} catch {return false;}
        });
        if (ids.size===1 && ids.has(match[2]) && author && node.querySelector('time') && node.innerText?.trim()) container=node;
      }
    }
    if (!container) continue;
    seen.add(match[2]);
    const time = container.querySelector('time');
    const assets = [...container.querySelectorAll('img,video')].map((asset) => ({
      kind: asset.tagName === 'VIDEO' ? 'video' : 'image',
      sourceUrl: asset.currentSrc || asset.src || sourceUrl,
      altText: asset.getAttribute('alt'),
    }));
    items.push({
      postId: match[2],
      sourceUrl,
      authorHandle: match[1],
      authorName: null,
      text: container.innerText?.trim() ?? '',
      postedAt: time?.getAttribute('datetime') ?? null,
      assets,
    });
  }
  return { authenticated, empty, items };
}

export function readXIdentityDocument() {
  const link = document.querySelector('[data-testid="AppTabBar_Profile_Link"]');
  const href = link?.getAttribute('href');
  return {
    handle: href?.match(/^\/([^/?#]+)/)?.[1] ?? null,
    name: link?.getAttribute('aria-label') ?? null,
  };
}

export function readXPostsDocument() {
  const authenticated = Boolean(document.querySelector('[data-testid="AppTabBar_Profile_Link"]'));
  const empty = Boolean(document.querySelector('[data-testid="emptyState"]'));
  const items = [];
  const seen = new Set();
  for (const tweet of document.querySelectorAll('[data-testid="tweet"]')) {
    const link = [...tweet.querySelectorAll('a[href*="/status/"]')].find((candidate) =>
      /\/status\/[^/?#]+/.test(candidate.getAttribute('href') ?? ''));
    const sourceUrl = link ? new URL(link.getAttribute('href'), location.origin).href : null;
    const match = sourceUrl?.match(/x\.com\/([^/]+)\/status\/([^/?#]+)/);
    if (!match || seen.has(match[2])) continue;
    seen.add(match[2]);
    const time = tweet.querySelector('time');
    const assets = [...tweet.querySelectorAll('[data-testid="tweetPhoto"] img, video')].map((asset) => ({
      kind: asset.tagName === 'VIDEO' ? 'video' : 'image',
      sourceUrl: asset.currentSrc || asset.src || sourceUrl,
      altText: asset.getAttribute('alt'),
    }));
    items.push({
      postId: match[2],
      sourceUrl,
      authorHandle: match[1],
      authorName: null,
      text: tweet.querySelector('[data-testid="tweetText"]')?.innerText?.trim() ?? '',
      postedAt: time?.getAttribute('datetime') ?? null,
      assets,
    });
  }
  return { authenticated, empty, items };
}

export function readSurfaceDocument(surface) {
  const names = {bookmarks:['Bookmarks','북마크','书签','書籤'],saved:['Saved','저장됨','已收藏','收藏','已儲存','儲存內容'],likes:['Likes','Liked','좋아요','赞','讚','赞过的内容','按讚的內容'],reposts:['Reposts','리포스트','转发','轉發','轉寄']}[surface] ?? [];
  const path=location.pathname.replace(/\/$/,'');
  const matchingRoute=surface==='saved'?path==='/saved':surface==='likes'?path==='/liked':surface==='bookmarks'?path==='/i/bookmarks':surface==='reposts'?/^\/@[^/]+\/reposts$/.test(path):false;
  if(matchingRoute && [...document.querySelectorAll('a[aria-label="列标题"],a[aria-label="列標題"],a[aria-label="欄標題"],a[aria-label="Column header"]')].some(node=>{
    if(!node.getClientRects().length) return false;
    try {return new URL(node.getAttribute('href'),location.origin).pathname.replace(/\/$/,'')===path;}catch{return false;}
  })) return true;
  const headingMatches=[...document.querySelectorAll('h1,h2,[role="heading"],[role="tab"][aria-selected="true"],a[aria-current="page"]')]
    .some(node => node.getClientRects().length > 0 && names.includes(node.textContent.trim()));
  if(headingMatches) return true;
  // Responsive Threads layouts omit page headings. Only accept the exact
  // collection route with authenticated profile navigation and dated posts.
  if(!matchingRoute || surface==='bookmarks') return false;
  const profileLabels=['프로필','Profile','个人主页','个人资料','個人檔案','個人主頁','個人資料'];
  const authenticated=[...document.querySelectorAll('a[href^="/@"]')].some(link=>
    [link.getAttribute('aria-label'),link.querySelector('svg')?.getAttribute('aria-label'),link.querySelector('svg title')?.textContent,link.textContent]
      .some(label=>profileLabels.includes((label||'').trim())));
  const datedPost=[...document.querySelectorAll('a[href*="/post/"]')].some(link=>link.querySelector('time[datetime]'));
  return authenticated && datedPost;
}
