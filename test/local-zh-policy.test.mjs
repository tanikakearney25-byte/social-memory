import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import {readThreadsIdentityDocument,readThreadsPostsDocument,readSurfaceDocument} from '../extension/document-readers.js';
import {createController} from '../extension/service-worker.js';
test('Chinese profile navigation verifies self identity and collection headings in Chrome', {skip:process.env.SOCIAL_MEMORY_CHROME_TEST!=='1'}, async () => {
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();
  await page.route('https://example.test/**',route=>route.fulfill({contentType:'text/html',body:'<html></html>'}));
  await page.goto('https://example.test/');
  for(const label of ['个人主页','個人檔案','个人资料','個人主頁']) {
   await page.setContent(`<a href="/@fictional_reader" aria-label="${label}"></a><h1>已收藏</h1><article><a href="https://www.threads.com/@fictional_author/post/fictional_post">link</a><time datetime="2026-01-01T00:00:00Z"></time><p>fictional body</p></article>`);
   assert.equal((await page.evaluate(readThreadsIdentityDocument)).handle,'fictional_reader');
   assert.equal((await page.evaluate(readThreadsPostsDocument)).authenticated,true);
   assert.equal(await page.evaluate(readSurfaceDocument,'saved'),true);
  }
  await page.setContent('<a href="/@fictional_other">fictional author</a>');
  assert.equal((await page.evaluate(readThreadsIdentityDocument)).handle,null);
  await page.setContent('<a href="/@fictional_reader"><svg><title>个人主页</title></svg></a><div><div><a href="/@fictional_author">fictional_author</a><span><a href="https://www.threads.com/@fictional_author/post/first"><time datetime="2026-01-01T00:00:00Z">date</time></a></span><p>First fictional body</p><button>Save</button></div><div><a href="/@fictional_other">fictional_other</a><span><a href="https://www.threads.com/@fictional_other/post/second"><time datetime="2026-01-02T00:00:00Z">date</time></a></span><p>Second fictional body</p><button>Save</button></div></div>');
  const divPosts=await page.evaluate(readThreadsPostsDocument);
  assert.equal(divPosts.items.length,2);
  assert.match(divPosts.items[0].text,/First fictional body/);
  assert.doesNotMatch(divPosts.items[0].text,/Second fictional body/);
  assert.match(divPosts.items[1].text,/Second fictional body/);
  assert.doesNotMatch(divPosts.items[1].text,/First fictional body/);
  await page.goto('https://example.test/saved/');
  await page.setContent('<a href="/saved/" aria-label="列标题">已收藏</a>');
  assert.equal(await page.evaluate(readSurfaceDocument,'saved'),true);
  assert.equal(await page.evaluate(readSurfaceDocument,'reposts'),false);
  await page.setContent('<nav><a href="/saved/">已收藏</a></nav>');
  assert.equal(await page.evaluate(readSurfaceDocument,'saved'),false);
  await page.setContent('<a style="display:none" href="/@fictional_reader"><svg><title>个人主页</title></svg></a><div><a href="/@fictional_author/post/first"><time datetime="2026-01-01T00:00:00Z">date</time></a><p>Fictional body</p></div>');
  assert.equal(await page.evaluate(readSurfaceDocument,'saved'),true);
  assert.equal(await page.evaluate(readSurfaceDocument,'reposts'),false);
 } finally {await browser.close();}
});
test('likes and daily collection remain available as user-controlled options',async()=>{
 const values={'social-memory:daily':true}; let cleared=false, created=false, requested=false;
 const controller=createController({
  storage:{get:async key=>({[key]:values[key]}),set:async value=>Object.assign(values,value)},
  alarms:{clear:async()=>{cleared=true;},create:async()=>{created=true;}},
  activeTab:async()=>({url:'https://www.threads.com/'}),readIdentity:async()=>({handle:'fictional_reader'}),
  request:async()=>{requested=true;},
 });
 await controller.ensureDailyAlarm();
 assert.equal(cleared,false); assert.equal(created,true); assert.equal(values['social-memory:daily'],true);
 const result=await controller.handle({type:'connect',selectedCaptureKinds:['like','save']});
 assert.equal(result.ok,true);assert.equal(requested,true);
});

