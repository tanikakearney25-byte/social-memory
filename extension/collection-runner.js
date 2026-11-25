export function parseCollectionLimit(value=100) {
  if(value==='unlimited') return Infinity;
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<1) throw new Error('采集数量必须为正整数，或选择无上限');
  return number;
}

// Persist each discovered batch before scrolling; existing sources remain deduplicated by the host.
export async function runCollection({limit=100,readPage,scrollPage,saveBatch,verifyIdentity,wait,
  isCancelled=()=>false,onProgress=()=>{}}) {
  const maximum=parseCollectionLimit(limit);
  const seen=new Set();let idle=0,stalled=0,loadingRounds=0,round=0;
  const finish=reason=>({count:seen.size,reason});
  while(true) {
    if(isCancelled()) return finish('cancelled');
    const snapshot=await readPage();
    if(snapshot?.background) {
      await onProgress({count:seen.size,reason:'waiting-focus'});
      await wait(1500);
      continue;
    }
    if(!snapshot?.authenticated) throw new Error('The signed-in account could not be verified; saved batches retained.');
    if(snapshot.blocked) throw new Error('页面要求验证或暂时限制访问；已停止，已保存的批次保留。');
    let added=0;
    const fresh=[];const roundSeen=new Set();
    for(const item of snapshot.items??[]) {
      if(!item.postId||seen.has(item.postId)||roundSeen.has(item.postId)) continue;
      roundSeen.add(item.postId);fresh.push({...item,text:item.text?.slice(0,10000)??''});
      if(seen.size+fresh.length>=maximum) break;
    }
    for(let offset=0;offset<fresh.length;offset+=25) {
      if(isCancelled()) return finish('cancelled');
      await verifyIdentity();
      const batch=fresh.slice(offset,offset+25);
      await saveBatch(batch);
      batch.forEach(item=>seen.add(item.postId));added+=batch.length;
      await onProgress({count:seen.size,reason:'running'});
    }
    if(seen.size>=maximum) return finish('limit-reached');
    if(snapshot.empty) return finish('explicit-empty');
    const scroll=await scrollPage();
    round++;
    if(snapshot.footerVisible && !snapshot.loading && scroll?.atBottom && seen.size>0) return finish('footer-visible');
    loadingRounds=snapshot.loading?loadingRounds+1:0;
    if(loadingRounds>=50) throw new Error('页面持续加载，已暂停；已保存的批次保留，可稍后重扫去重。');
    idle=!added&&!snapshot.loading&&scroll?.atBottom===true?idle+1:0;
    stalled=!added&&!snapshot.loading&&scroll?.atBottom!==true&&scroll?.moved!==true?stalled+1:0;
    if(stalled>=15) throw new Error(seen.size?'滚动后未出现新帖子，无法确认列表结束；已保存的批次保留。':'No posts extracted; collection page structure or scrolling could not be parsed.');
    await onProgress({count:seen.size,reason:'running',round,idle,loading:Boolean(snapshot.loading),scroll});
    if(idle>=25) {
      if(!seen.size) throw new Error('No posts extracted; collection page structure could not be parsed.');
      return finish('end-observed');
    }
    await wait(1200);
  }
}

export async function scrollCollectionDocument() {
  const root=document.scrollingElement||document.documentElement;
  const inView=node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
  const links=[...document.querySelectorAll('a[href*="/post/"],a[href*="/status/"]')].filter(inView);
  const last=links.at(-1);
  let preferred=null;
  for(let node=last?.parentElement;node&&node!==document.body;node=node.parentElement) {
    if(node.clientHeight>150&&node.scrollHeight>node.clientHeight+8&&/auto|scroll|overlay|hidden/.test(getComputedStyle(node).overflowY)&&inView(node)){preferred=node;break;}
  }
  const candidates=[...document.querySelectorAll('div,main,section,[role="main"]')].filter(node=>
    node.clientHeight>150 && node.scrollHeight>node.clientHeight+8 &&
    /auto|scroll|overlay/.test(getComputedStyle(node).overflowY) && inView(node) &&
    node.querySelector('a[href*="/post/"],a[href*="/status/"]'));
  candidates.sort((a,b)=>b.querySelectorAll('a[href*="/post/"],a[href*="/status/"]').length-a.querySelectorAll('a[href*="/post/"],a[href*="/status/"]').length);
  const target=preferred||candidates[0]||root;
  const previous=target.__socialMemoryScrollCheckpoint;
  const recovered=Boolean(previous && target.scrollTop+target.clientHeight*2<previous.top);
  if(recovered) target.scrollTop=Math.min(previous.top,Math.max(0,target.scrollHeight-target.clientHeight));
  const before=target.scrollTop;
  const wasBottom=before+target.clientHeight>=target.scrollHeight-8;
  if(wasBottom && before>0) {
    target.scrollTop=Math.max(0,before-96);
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  target.scrollTop=before;
  target.scrollTop+=Math.max(150,Math.floor(target.clientHeight*.8));
  target.__socialMemoryScrollCheckpoint={top:target.scrollTop};
  return {moved:target.scrollTop!==before,atBottom:target.scrollTop+target.clientHeight>=target.scrollHeight-8,
    top:target.scrollTop,height:target.clientHeight,totalHeight:target.scrollHeight,target:target.tagName,overflow:getComputedStyle(target).overflowY,
    visibleLinks:links.length,documentVisible:document.visibilityState,documentFocused:document.hasFocus(),bottomProbe:wasBottom,recovered};
}

export function readCollectionLoadState(surface) {
  const visible=node=>node.getClientRects().length>0;
  let footerVisible=false;
  if(surface==='saved') {
    const labels={terms:/^Threads\s*(条款|條款|Terms)$/i,privacy:/^(隐私政策|隱私政策|私隱政策|Privacy policy)$/i,cookies:/^Cookies?\s*(政策|Policy)$/i};
    const terms=[...document.querySelectorAll('a[href]')].filter(link=>labels.terms.test((link.textContent||'').trim()));
    for(const link of terms) {
      for(let node=link.parentElement,depth=0;node&&depth<8;node=node.parentElement,depth++) {
        const rect=node.getBoundingClientRect();
        const text=(node.textContent||'').trim();
        if(!visible(node)||rect.height>240||rect.width<=0||rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth||text.length>300||!/©\s*20\d{2}/.test(text)) continue;
        const anchors=[...node.querySelectorAll('a[href]')];
        if(Object.values(labels).every(pattern=>anchors.some(a=>pattern.test((a.textContent||'').trim())))) {footerVisible=true;break;}
      }
      if(footerVisible) break;
    }
  }
  return {
    footerVisible,
    background:document.visibilityState==='hidden',
    loading:[...document.querySelectorAll('[role="progressbar"],[aria-busy="true"]')].some(visible),
    blocked:[...document.querySelectorAll('[role="alert"],[role="dialog"]')].some(node=>visible(node)&&/too many requests|try again later|verify your|请求过于频繁|稍后再试|稍後再試|验证身份|驗證身分/i.test(node.textContent||'')),
  };
}
