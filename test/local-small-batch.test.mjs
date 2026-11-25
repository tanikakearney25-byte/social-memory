import test from 'node:test';
import assert from 'node:assert/strict';
import { createController, collectPlatform } from '../extension/service-worker.js';
test('manual collection uses the upstream bound of 100 posts per selected stream', async () => {
  let observed;
  const controller = createController({
    activeTab: async () => ({url:'https://www.threads.com/'}),
    storage: {get:async () => ({'social-memory:settings:threads':{connected:true,handle:'fictional_reader',selectedCaptureKinds:['save','repost']}})},
    collect: async (...args) => {observed=args;return {};},
  });
  assert.equal((await controller.handle({type:'collect-now'})).ok,true);
  assert.deepEqual(observed,['threads',['save','repost'],100,'fictional_reader']);
});
test('unparsed collection fails instead of reporting successful empty ingest',async()=>{
 const requests=[];
 const chromeApi={
  storage:{local:{get:async()=>({'social-memory:installation-id':'11111111-1111-4111-8111-111111111111'})}},
  tabs:{create:async options=>{assert.equal(options.active,true);return {id:9};},get:async()=>({status:'complete'}),remove:async()=>{}},
  scripting:{executeScript:async({func})=>[{result:
   func.name==='readThreadsIdentityDocument'?{handle:'fictional_reader'}:
   func.name==='readSurfaceDocument'?true:
   func.name==='readThreadsPostsDocument'?{authenticated:true,empty:false,items:[]}:
   func.name==='readThreadsNavigationDiagnostics'?{origin:'https://www.threads.com',path:'/saved/',postLinkCount:5}:null
  }]},
 };
 await assert.rejects(collectPlatform('threads',['save'],3,{chromeApi,expectedHandle:'fictional_reader',wait:async()=>{},request:async(method,params)=>requests.push({method,params})}),/No posts extracted/);
 assert.equal(requests.some(x=>x.method==='ingest'),false);
 assert.equal(requests.some(x=>x.method==='health'&&x.params.diagnostics?.postLinkCount===5),true);
});
test('unrecognized Threads navigation can be diagnosed through the local bridge', async()=>{
 let observed;
 const controller=createController({
  activeTab:async()=>({url:'https://www.threads.com/'}),
  readIdentity:async()=>({handle:null,diagnostics:{origin:'https://www.threads.com',navigation:[]}}),
  storage:{get:async()=>({})},
  request:async(method,params)=>{observed={method,params};},
 });
 assert.equal((await controller.handle({type:'get-state'})).ok,true);
 assert.equal(observed.params.diagnostics.origin,'https://www.threads.com');
});
test('collection count accepts custom and unlimited choices and rejects invalid input',async()=>{
 let observed;
 const controller=createController({activeTab:async()=>({url:'https://www.threads.com/'}),storage:{get:async()=>({'social-memory:settings:threads':{connected:true,handle:'fictional_reader',selectedCaptureKinds:['save']}})},collect:async(...args)=>{observed=args;return {items:0};}});
 await controller.handle({type:'collect-now',limit:500});assert.equal(observed[2],500);
 await controller.handle({type:'collect-now',limit:'unlimited'});assert.equal(observed[2],'unlimited');
 assert.equal((await controller.handle({type:'collect-now',limit:-1})).ok,false);
});
test('background job starts without holding a popup message open and can be stopped',async()=>{
 let finish;let cancellation;
 const controller=createController({activeTab:async()=>({url:'https://www.threads.com/'}),storage:{get:async()=>({'social-memory:settings:threads':{connected:true,handle:'fictional_reader',selectedCaptureKinds:['save']}})},collect:async(_p,_k,_l,_h,options)=>{
  cancellation=options.isCancelled;options.onProgress({total:25,count:25,kind:'save'});
  return new Promise(resolve=>{finish=resolve;});
 }});
 assert.equal((await controller.handle({type:'start-collection',limit:'unlimited'})).result.started,true);
 assert.equal((await controller.handle({type:'get-job'})).result.total,25);
 assert.equal((await controller.handle({type:'start-collection',limit:10})).ok,false);
 await controller.handle({type:'stop-collection'});assert.equal(cancellation(),true);
 finish({items:25,streams:[]});
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal((await controller.handle({type:'get-job'})).result.status,'cancelled');
});
test('a new tab may render the account link late without becoming an account mismatch',async()=>{
 let attempts=0,waited=0;const requests=[];
 const chromeApi={storage:{local:{get:async()=>({'social-memory:installation-id':'11111111-1111-4111-8111-111111111111'})}},tabs:{create:async()=>({id:9}),get:async()=>({status:'complete'}),remove:async()=>{}},scripting:{executeScript:async({func})=>[{result:func.name==='readThreadsIdentityDocument'?(++attempts<3?{handle:null}:{handle:'fictional_reader'}):func.name==='readSurfaceDocument'?true:func.name==='readThreadsPostsDocument'?{authenticated:true,empty:true,items:[]}:{} }]}};
 const result=await collectPlatform('threads',['save'],'unlimited',{chromeApi,expectedHandle:'fictional_reader',wait:async()=>{waited++;},request:async(method,params)=>requests.push({method,params})});
 assert.equal(waited,2);assert.equal(result.streams[0].reason,'explicit-empty');
 assert.equal(requests[0].params.collectionTrace.stage,'opening');
 assert.equal(requests.at(-1).params.collectionTrace.stage,'finished');
});
