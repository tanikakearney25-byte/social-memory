import {resolveLanguage,translate,translateError} from './popup-i18n.js';
const identity=document.querySelector('#identity');
const host=document.querySelector('#host');
const result=document.querySelector('#result');
const connect=document.querySelector('#connect');
const collectNow=document.querySelector('#collect-now');
const daily=document.querySelector('#daily');
const choices=[...document.querySelectorAll('[name="capture-kind"]')];
const limitChoice=document.querySelector('#collection-limit');
const customLimit=document.querySelector('#custom-limit');
const stopCollection=document.querySelector('#stop-collection');
const languageChoice=document.querySelector('#interface-language');
const LANGUAGE_KEY='social-memory:interface-language';
let language=resolveLanguage('auto',navigator.language),connected=false,lastState=null,loadError=null;
let message={key:'working',params:{}};
const t=(key,params={})=>translate(language,key,params);
function renderMessage(){
  const params={...message.params};
  if(message.error!==undefined) params.error=translateError(language,message.error);
  result.textContent=message.key?t(message.key,params):translateError(language,message.error);
}
function show(key,params={}){message={key,params};renderMessage();}
function showError(error){message={error:error?.message??String(error)};renderMessage();}
function renderIdentity(){
  if(loadError){identity.textContent=t('openSite');host.textContent=translateError(language,loadError);return;}
  if(!lastState)return;
  identity.textContent=lastState.handle?`${lastState.platform.toUpperCase()} · @${lastState.handle}`:t('profileMissing');
  host.textContent=t(lastState.hostReady?'bridgeReady':'bridgeMissing');
}
function applyLanguage(){
  language=resolveLanguage(languageChoice.value,navigator.language);
  document.documentElement.lang=language;
  for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n,{n:node.dataset.n});
  for(const node of document.querySelectorAll('[data-i18n-placeholder]'))node.placeholder=t(node.dataset.i18nPlaceholder);
  renderIdentity();renderMessage();
}
function chosenLimit(){
  if(limitChoice.value==='unlimited')return 'unlimited';
  const value=Number(limitChoice.value==='custom'?customLimit.value:limitChoice.value);
  if(!Number.isSafeInteger(value)||value<1)throw new Error('Enter a positive whole number.');
  return value;
}
function selectedKinds(){return choices.filter(({checked})=>checked).map(({value})=>value);}
function refreshButtons(){connect.disabled=selectedKinds().length===0;}
async function send(request){
  show('working');
  const response=await chrome.runtime.sendMessage(request);
  if(!response.ok)throw new Error(response.error);
  return response.result;
}
async function refreshJob(){
  const response=await chrome.runtime.sendMessage({type:'get-job'});
  if(!response?.ok)return;
  const job=response.result,running=job.status==='running';
  stopCollection.hidden=!running;
  collectNow.disabled=running||!connected;
  connect.disabled=running||selectedKinds().length===0;
  limitChoice.disabled=running;customLimit.disabled=running;
  choices.forEach(choice=>{choice.disabled=running;});
  const count=job.total||0;
  if(running)show(job.reason==='waiting-focus'?'waiting':'running',{count,kind:job.kind?t(job.kind):'—'});
  if(job.status==='error'){message={key:'failed',params:{count},error:job.error};renderMessage();}
  if(job.status==='cancelled')show('cancelled',{count});
  if(job.status==='done'){
    const footer=job.result?.streams?.some(stream=>stream.reason==='footer-visible');
    const observed=job.result?.streams?.some(stream=>stream.reason==='end-observed');
    show('done',{count,ending:t(footer?'footerEnd':observed?'observedEnd':'limitEnd')});
  }
}
async function load(){
  try{
    const stored=await chrome.storage?.local?.get(LANGUAGE_KEY);
    const preference=stored?.[LANGUAGE_KEY]??'auto';
    languageChoice.value=[...languageChoice.options].some(option=>option.value===preference)?preference:'auto';
  }catch{/* Use browser language if preference storage is unavailable. */}
  applyLanguage();
  try{
    const state=await send({type:'get-state'});lastState=state;renderIdentity();
    host.classList.toggle('error',!state.hostReady);
    for(const choice of choices){choice.checked=state.settings?.selectedCaptureKinds?.includes(choice.value)??choice.value!=='like';choice.disabled=false;}
    daily.checked=state.daily;daily.disabled=false;
    connected=Boolean(state.settings?.connected);collectNow.disabled=!connected;
    const savedLimit=String(state.collectionLimit??100);
    if([...limitChoice.options].some(option=>option.value===savedLimit))limitChoice.value=savedLimit;
    else{limitChoice.value='custom';customLimit.value=savedLimit;}
    customLimit.hidden=limitChoice.value!=='custom';
    show(connected?'connected':'choose');refreshButtons();await refreshJob();
  }catch(error){
    loadError=error.message;
    identity.textContent=t('openSite');host.textContent=translateError(language,error.message);host.classList.add('error');
    connect.disabled=true;collectNow.disabled=true;showError(error);
  }
}
for(const choice of choices)choice.addEventListener('change',refreshButtons);
connect.addEventListener('click',async()=>{
  try{await send({type:'connect',selectedCaptureKinds:selectedKinds()});connected=true;collectNow.disabled=false;show('justConnected');}
  catch(error){showError(error);}
});
collectNow.addEventListener('click',async()=>{
  try{const limit=chosenLimit();await send({type:'set-collection-limit',limit});await send({type:'start-collection',limit});await refreshJob();}
  catch(error){showError(error);}
});
daily.addEventListener('change',async()=>{
  try{await send({type:'set-daily',enabled:daily.checked});show(daily.checked?'dailyOn':'dailyOff');}
  catch(error){showError(error);}
});
limitChoice.addEventListener('change',()=>{customLimit.hidden=limitChoice.value!=='custom';});
stopCollection.addEventListener('click',async()=>{
  try{await send({type:'stop-collection'});show('stopping');}
  catch(error){showError(error);}
});
languageChoice.addEventListener('change',async()=>{
  applyLanguage();await refreshJob().catch(()=>{});
  try{await chrome.storage.local.set({[LANGUAGE_KEY]:languageChoice.value});}
  catch(error){message={key:'languageSaveError',params:{},error:error.message};renderMessage();}
});
void load();
setInterval(()=>refreshJob().catch(()=>{}),1300);
