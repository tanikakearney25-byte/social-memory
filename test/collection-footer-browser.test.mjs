import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {readCollectionLoadState} from '../extension/collection-runner.js';
test('saved footer requires visible copyright plus terms, privacy and cookie links; other streams ignore it',{skip:process.env.SOCIAL_MEMORY_CHROME_TEST!=='1'},async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:900,height:650}});
  const footer='<footer>© 2026 <a href="https://example.test/terms">Threads 条款</a> <a href="https://example.test/privacy">隐私政策</a> <a href="https://example.test/cookies">Cookie 政策</a></footer>';
  await page.setContent('<div style="height:1600px">Fictional posts</div>'+footer);
  assert.equal((await page.evaluate(readCollectionLoadState,'saved')).footerVisible,false);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  assert.equal((await page.evaluate(readCollectionLoadState,'saved')).footerVisible,true);
  assert.equal((await page.evaluate(readCollectionLoadState,'reposts')).footerVisible,false);
  await page.setContent('<footer>© 2026 <a href="https://example.test/terms">Threads 条款</a></footer>');
  assert.equal((await page.evaluate(readCollectionLoadState,'saved')).footerVisible,false);
  await page.setContent('<div hidden>'+footer+'</div>');
  assert.equal((await page.evaluate(readCollectionLoadState,'saved')).footerVisible,false);
 }finally{await browser.close();}
});
