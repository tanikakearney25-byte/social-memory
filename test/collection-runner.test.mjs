import test from 'node:test';
import assert from 'node:assert/strict';
import {runCollection,parseCollectionLimit} from '../extension/collection-runner.js';
const item=n=>({postId:`fictional_${n}`,text:`fictional ${n}`});
test('limit is explicit and validated; unlimited has no numeric ceiling',()=>{
 assert.equal(parseCollectionLimit('unlimited'),Infinity);
 assert.equal(parseCollectionLimit('500'),500);
 for(const x of [0,-1,1.5,'oops',NaN]) assert.throws(()=>parseCollectionLimit(x));
});
test('unlimited saves more than 100 items and more than 40 scrolls in bounded batches',async()=>{
 let round=0;const saved=[];
 const result=await runCollection({limit:'unlimited',readPage:async()=>({authenticated:true,items:round<65?[item(round*2),item(round*2+1)]:[]}),scrollPage:async()=>({atBottom:++round>=65}),saveBatch:async batch=>{assert.ok(batch.length<=25);saved.push(...batch);},verifyIdentity:async()=>{},wait:async()=>{}});
 assert.equal(result.count,130);assert.equal(saved.length,130);assert.equal(result.reason,'end-observed');
});
test('numeric selection caps each stream and deduplicates repeated snapshots',async()=>{
 const saved=[];
 const result=await runCollection({limit:3,readPage:async()=>({authenticated:true,items:[item(0),item(0),item(1),item(2),item(3)]}),scrollPage:async()=>({atBottom:true}),saveBatch:async b=>saved.push(...b),verifyIdentity:async()=>{},wait:async()=>{}});
 assert.equal(saved.length,3);assert.equal(result.reason,'limit-reached');
});
test('cancel preserves flushed batches, account loss prevents further writes',async()=>{
 let cancel=false;let saved=0;
 const result=await runCollection({limit:'unlimited',readPage:async()=>({authenticated:true,items:[item(0)]}),scrollPage:async()=>({atBottom:false}),saveBatch:async b=>{saved+=b.length;cancel=true;},verifyIdentity:async()=>{},wait:async()=>{},isCancelled:()=>cancel});
 assert.equal(saved,1);assert.equal(result.reason,'cancelled');
 let n=0;
 await assert.rejects(runCollection({limit:'unlimited',readPage:async()=>({authenticated:++n===1,items:[item(n)]}),scrollPage:async()=>({atBottom:false}),saveBatch:async()=>{},verifyIdentity:async()=>{},wait:async()=>{}}),/signed-in/);
});
test('a loading page cannot count as exhausted, and an unparsed page is an error',async()=>{
 let n=0;
 const result=await runCollection({limit:1,readPage:async()=>({authenticated:true,loading:++n<9,items:n<9?[]:[item(0)]}),scrollPage:async()=>({atBottom:true}),saveBatch:async()=>{},verifyIdentity:async()=>{},wait:async()=>{}});
 assert.equal(result.count,1);
 await assert.rejects(runCollection({limit:10,readPage:async()=>({authenticated:true,items:[]}),scrollPage:async()=>({atBottom:true}),saveBatch:async()=>{},verifyIdentity:async()=>{},wait:async()=>{}}),/No posts extracted/);
});
test('failure in a later batch retains earlier writes and does not continue scrolling',async()=>{
 let writes=0,scrolls=0;
 await assert.rejects(runCollection({limit:'unlimited',readPage:async()=>({authenticated:true,items:Array.from({length:60},(_,n)=>item(n))}),scrollPage:async()=>{scrolls++;return {atBottom:false};},saveBatch:async()=>{if(++writes===2) throw new Error('host unavailable');},verifyIdentity:async()=>{},wait:async()=>{}}),/host unavailable/);
 assert.equal(writes,2);assert.equal(scrolls,0);
});
test('temporary bottom without a spinner does not end before a delayed page arrives',async()=>{
 let round=0;const saved=[];
 const result=await runCollection({limit:'unlimited',readPage:async()=>({authenticated:true,items:round===0?[item(0)]:round>=12?[item(1)]:[]}),scrollPage:async()=>{round++;return {atBottom:true};},saveBatch:async batch=>saved.push(...batch),verifyIdentity:async()=>{},wait:async()=>{}});
 assert.equal(result.count,2);assert.equal(saved.length,2);
});
test('moving through a long previously seen section is not mistaken for a stalled scroll',async()=>{
 let round=0;
 const result=await runCollection({limit:2,readPage:async()=>({authenticated:true,items:[item(round>=40?1:0)]}),scrollPage:async()=>{round++;return {moved:true,atBottom:false};},saveBatch:async()=>{},verifyIdentity:async()=>{},wait:async()=>{}});
 assert.equal(result.count,2);
});
test('visible collection footer ends after saving the final snapshot at the bottom',async()=>{
 const saved=[];let waited=0;
 const result=await runCollection({limit:'unlimited',readPage:async()=>({authenticated:true,footerVisible:true,items:[item(0),item(1)]}),scrollPage:async()=>({atBottom:true}),saveBatch:async batch=>saved.push(...batch),verifyIdentity:async()=>{},wait:async()=>{waited++;}});
 assert.equal(result.reason,'footer-visible');assert.equal(saved.length,2);assert.equal(waited,0);
});
