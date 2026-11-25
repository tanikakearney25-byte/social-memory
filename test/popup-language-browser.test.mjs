import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
test('all popup languages switch live, translate progress and errors, and persist after reopening',{skip:process.env.SOCIAL_MEMORY_CHROME_TEST!=='1'},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({locale:'ja-JP',viewport:{width:390,height:900}});
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://example.test/**',async route=>{
   const path=new URL(route.request().url()).pathname.slice(1)||'popup.html';
   if(!['popup.html','popup.js','popup.css','popup-i18n.js'].includes(path))return route.abort();
   await route.fulfill({contentType:path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html',body:await readFile(new URL(`../extension/${path}`,import.meta.url),'utf8')});
  });
  await page.addInitScript(()=>{
   window.testJob={status:'idle',total:0};window.requests=[];
   window.chrome={storage:{local:{get:async key=>({[key]:localStorage.getItem(key)}),set:async values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);}}},runtime:{sendMessage:async request=>{
    window.requests.push(request);
    if(request.type==='get-state')return {ok:true,result:{handle:'fictional_reader',platform:'threads',hostReady:true,settings:{connected:true,selectedCaptureKinds:['save','repost']},daily:false,collectionLimit:100}};
    if(request.type==='get-job')return {ok:true,result:window.testJob};
    return {ok:true,result:{}};
   }}};
  });
  await page.goto('https://example.test/popup.html');
  await page.waitForFunction(()=>document.querySelector('#collect-now').textContent==='今すぐ収集');
  for(const [locale,label]of [['zh-CN','立即采集'],['zh-TW','立即收集'],['en','Collect now'],['ko','지금 수집'],['ja','今すぐ収集']]){
   await page.selectOption('#interface-language',locale);
   await page.waitForFunction(expected=>document.querySelector('#collect-now').textContent===expected,label);
   assert.equal(await page.locator('html').getAttribute('lang'),locale);
   await page.waitForFunction(expected=>localStorage.getItem('social-memory:interface-language')===expected,locale);
  }
  await page.selectOption('#interface-language','ko');
  await page.waitForFunction(()=>localStorage.getItem('social-memory:interface-language')==='ko');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#collect-now').textContent==='지금 수집');
  assert.equal(await page.locator('#interface-language').inputValue(),'ko');
  await page.evaluate(()=>window.testJob={status:'running',total:204,kind:'repost'});
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('204'));
  assert.match(await page.locator('#result').textContent(),/리포스트/);
  await page.selectOption('#interface-language','ja');
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('リポスト'));
  await page.evaluate(()=>window.testJob={status:'error',total:204,error:'The signed-in account could not be detected'});
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('ログイン'));
  assert.doesNotMatch(await page.locator('#result').textContent(),/signed-in/);
  await page.selectOption('#interface-language','zh-CN');
  await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('登录'));
  await page.screenshot({path:join(tmpdir(),'social-memory-language-selector-test.png'),fullPage:true});
  assert.equal(await page.locator('[value="like"]').isDisabled(),false);
  assert.equal(await page.locator('#daily').isDisabled(),false);
  assert.equal(await page.evaluate(()=>window.requests.some(x=>['start-collection','connect','set-daily'].includes(x.type))),false);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
