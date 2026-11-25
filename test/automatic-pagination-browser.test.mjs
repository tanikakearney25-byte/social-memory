import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {runCollection,scrollCollectionDocument} from '../extension/collection-runner.js';
test('automatic scrolling loads delayed pages without assistance and ignores an offscreen feed',{skip:process.env.SOCIAL_MEMORY_CHROME_TEST!=='1'},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:900,height:700}});
  await page.setContent('<div id="offscreen" style="position:absolute;left:-3000px;width:500px;height:500px;overflow:auto"><div style="height:9999px">'+Array.from({length:100},(_,i)=>`<a href="/@fictional/post/decoy_${i}">decoy</a>`).join('')+'</div></div><div id="feed" style="height:300px;overflow:hidden;width:500px"></div>');
  await page.evaluate(()=>{
   const feed=document.querySelector('#feed');window.loaded=0;let loading=false;
   const append=()=>{for(let n=0;n<8&&window.loaded<64;n++){const id=window.loaded++;feed.insertAdjacentHTML('beforeend',`<div style="height:80px"><a href="/@fictional/post/post_${id}">Fictional ${id}</a></div>`);}};
   append();
   feed.addEventListener('scroll',()=>{
    if(!loading&&window.loaded<64&&feed.scrollTop+feed.clientHeight>=feed.scrollHeight-20){loading=true;setTimeout(()=>{append();loading=false;},250);}
   });
  });
  const saved=[];
  const result=await runCollection({limit:'unlimited',
   readPage:()=>page.evaluate(()=>({authenticated:true,items:[...document.querySelectorAll('#feed a')].map(a=>({postId:a.getAttribute('href').split('/').at(-1),text:a.textContent}))})),
   scrollPage:()=>page.evaluate(scrollCollectionDocument),saveBatch:async batch=>saved.push(...batch),verifyIdentity:async()=>{},wait:()=>page.waitForTimeout(80),
  });
  assert.equal(result.count,64);assert.equal(saved.length,64);
  assert.equal(await page.evaluate(()=>document.querySelector('#offscreen').scrollTop),0);
  await page.evaluate(()=>{document.querySelector('#feed').scrollTop=0;});
  await page.evaluate(scrollCollectionDocument);
  assert.ok(await page.evaluate(()=>document.querySelector('#feed').scrollTop>2000),'recover an unexpected jump to the top without rescanning the whole list');
 }finally{await browser.close();}
});
