import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {scrollCollectionDocument} from '../extension/collection-runner.js';
test('popup accepts custom and unlimited values, starts a background task, shows progress and stops',{skip:process.env.SOCIAL_MEMORY_CHROME_TEST!=='1'},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:380,height:760}});
  await page.route('https://example.test/**',async route=>{
   const path=new URL(route.request().url()).pathname.slice(1)||'popup.html';
   if(!['popup.html','popup.js','popup.css','popup-i18n.js'].includes(path)) return route.abort();
   await route.fulfill({contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html',body:await readFile(new URL(`../extension/${path}`,import.meta.url),'utf8')});
  });
  await page.addInitScript(()=>{
   window.calls=[];window.job={status:'idle',total:0};
   window.chrome={runtime:{sendMessage:async message=>{
    window.calls.push(message);
    if(message.type==='get-state') return {ok:true,result:{handle:'fictional_reader',platform:'threads',hostReady:true,settings:{connected:true,selectedCaptureKinds:['save','repost']},daily:false,collectionLimit:100}};
    if(message.type==='get-job') return {ok:true,result:window.job};
    if(message.type==='start-collection') window.job={status:'running',total:25,kind:'save'};
    if(message.type==='stop-collection') window.job={status:'cancelled',total:25};
    return {ok:true,result:{}};
   }}};
  });
  await page.goto('https://example.test/popup.html');
  await page.waitForFunction(()=>!document.querySelector('#collect-now').disabled);
  await page.selectOption('#collection-limit','custom');
  await page.fill('#custom-limit','275');
  await page.click('#collect-now');
  await page.waitForFunction(()=>window.calls.some(x=>x.type==='start-collection'));
  assert.equal((await page.evaluate(()=>window.calls.find(x=>x.type==='start-collection'))).limit,275);
  assert.match(await page.locator('#result').textContent(),/25/);
  await page.click('#stop-collection');
  await page.waitForFunction(()=>!document.querySelector('#collection-limit').disabled);
  await page.selectOption('#collection-limit','unlimited');
  await page.click('#collect-now');
  await page.waitForFunction(()=>window.calls.filter(x=>x.type==='start-collection').length===2);
  assert.equal((await page.evaluate(()=>window.calls.filter(x=>x.type==='start-collection').at(-1))).limit,'unlimited');
  await page.screenshot({path:join(tmpdir(),'social-memory-quantity-popup-test.png'),fullPage:true});
  assert.equal(await page.locator('[value="like"]').isDisabled(),true);
  assert.equal(await page.locator('#daily').isDisabled(),false);
  await page.click('#stop-collection');
  await page.waitForFunction(()=>!document.querySelector('#collection-limit').disabled);
  assert.equal(await page.locator('[value="like"]').isDisabled(),false);
  await page.setContent('<div id="scroller" style="height:250px;overflow-y:auto"><div style="height:1500px"><a href="/@fictional/post/id">post</a></div></div>');
  const scroll=await page.evaluate(scrollCollectionDocument);
  assert.equal(scroll.moved,true);
  assert.equal(await page.evaluate(()=>document.querySelector('#scroller').scrollTop>0),true);
  assert.equal(await page.evaluate(()=>window.scrollY),0);
 }finally{await browser.close();}
});
