import {
  readSurfaceDocument,
  readThreadsIdentityDocument,
  readThreadsPostsDocument,
  readXIdentityDocument,
  readXPostsDocument,
} from './document-readers.js';

const HOST_NAME = 'com.ohmyjiro.social_memory';
import { readThreadsNavigationDiagnostics } from './local-diagnostics.js';
import { runCollection, parseCollectionLimit, scrollCollectionDocument, readCollectionLoadState } from './collection-runner.js';
const INSTALLATION_KEY = 'social-memory:installation-id';
const DAILY_KEY = 'social-memory:daily';
const DAILY_ALARM = 'social-memory-daily';

function settingsKey(platform) {
  return `social-memory:settings:${platform}`;
}

export async function getInstallationId(storage = globalThis.chrome.storage.local) {
  const stored = (await storage.get(INSTALLATION_KEY))[INSTALLATION_KEY];
  if (typeof stored === 'string') return stored;
  const installationId = crypto.randomUUID();
  await storage.set({ [INSTALLATION_KEY]: installationId });
  return installationId;
}

export function detectPlatform(tab) {
  try {
    const hostname = new URL(tab?.url).hostname;
    if (['x.com', 'twitter.com'].includes(hostname)) return 'x';
    if (hostname === 'threads.com' || hostname.endsWith('.threads.com')) return 'threads';
  } catch {}
  return null;
}

export function nativeRequest(method, params, runtime = globalThis.chrome.runtime) {
  return new Promise((resolve, reject) => {
    const port = runtime.connectNative(HOST_NAME);
    const id = crypto.randomUUID();
    let settled = false;
    port.onMessage.addListener((message) => {
      if (settled || message?.id !== id) return;
      settled = true;
      port.disconnect();
      if (message.ok) resolve(message.result);
      if (!message.ok) reject(Object.assign(new Error(message.error?.message || 'Native host request failed'), { code: message.error?.code }));
    });
    port.onDisconnect.addListener(() => {
      if (settled) return;
      settled = true;
      reject(new Error(runtime.lastError?.message || 'Social Memory native host is not installed'));
    });
    port.postMessage({ version: 1, id, method, params });
  });
}

async function execute(chromeApi, tabId, func, args = []) {
  const [injection] = await chromeApi.scripting.executeScript({ target: { tabId }, func, args });
  return injection?.result;
}

async function waitForTab(chromeApi, tabId) {
  if ((await chromeApi.tabs.get(tabId)).status === 'complete') return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chromeApi.tabs.onUpdated.removeListener(listener);
      reject(new Error('Collection page did not finish loading'));
    }, 20_000);
    function listener(updatedId, changeInfo) {
      if (updatedId !== tabId || changeInfo.status !== 'complete') return;
      clearTimeout(timeout);
      chromeApi.tabs.onUpdated.removeListener(listener);
      resolve();
    }
    chromeApi.tabs.onUpdated.addListener(listener);
  });
}

function routeFor(platform, kind, handle) {
  if (platform === 'x') return {
    like: `https://x.com/${handle}/likes`,
    save: 'https://x.com/i/bookmarks',
    repost: `https://x.com/${handle}/reposts`,
  }[kind];
  return {
    like: 'https://www.threads.com/liked/',
    save: 'https://www.threads.com/saved/',
    repost: `https://www.threads.com/@${handle}/reposts`,
  }[kind];
}

function surfaceFor(platform, kind) {
  if (kind === 'like') return 'likes';
  if (kind === 'repost') return 'reposts';
  return platform === 'x' ? 'bookmarks' : 'saved';
}

function normalizedHandle(value) {
  return String(value ?? '').replace(/^@/, '').toLowerCase();
}

async function readIdentityFromTab(chromeApi, tabId, platform) {
  const identity = await execute(chromeApi, tabId, platform === 'x' ? readXIdentityDocument : readThreadsIdentityDocument);
  if (platform === 'threads' && !identity?.handle) {
    return { ...identity, diagnostics: await execute(chromeApi, tabId, readThreadsNavigationDiagnostics) };
  }
  return identity;
}

async function collectTab(chromeApi, tabId, platform, surface, limit, request, options) {
  const reader = platform === 'x' ? readXPostsDocument : readThreadsPostsDocument;
  try {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await execute(chromeApi, tabId, readSurfaceDocument, [surface])) break;
    if (attempt === 59) throw new Error('The requested collection page could not be verified');
    if(options.isCancelled()) return {count:0,reason:'cancelled'};
    await options.wait(500);
  }
  return await runCollection({
    limit,
    readPage: async()=>({...await execute(chromeApi,tabId,reader),...await execute(chromeApi,tabId,readCollectionLoadState,[surface])}),
    scrollPage:()=>execute(chromeApi,tabId,scrollCollectionDocument),
    wait:options.wait,
    saveBatch:options.saveBatch,
    verifyIdentity:options.verifyIdentity,
    isCancelled:options.isCancelled,
    onProgress:options.onProgress,
  }); } catch(error) {
    if (platform==='threads') {
    const diagnostics=await execute(chromeApi,tabId,readThreadsNavigationDiagnostics);
    await request('health',{diagnostics:{...diagnostics,surface,error:error.message}}).catch(()=>{});
    }
    throw error;
  }
}

export async function collectPlatform(platform, selectedCaptureKinds, limit = 100, {
  chromeApi = globalThis.chrome,
  expectedHandle,
  request = nativeRequest,
  wait = ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  isCancelled = ()=>false,
  onProgress = ()=>{},
} = {}) {
  parseCollectionLimit(limit);
  if (!['x', 'threads'].includes(platform)) throw new Error('Unsupported collection platform');
  const kinds = [...new Set(selectedCaptureKinds ?? [])];
  if (!kinds.length || kinds.some((kind) => !['like', 'save', 'repost'].includes(kind))) {
    throw new Error('Select at least one supported capture kind');
  }
  const installationId = await getInstallationId(chromeApi.storage.local);
  const summary = { platform, items: 0, streams: [] };
  for (const kind of kinds) {
    if(isCancelled()) break;
    await request('health',{collectionTrace:{platform,kind,stage:'opening',recordedAt:new Date().toISOString()}});
    const route = routeFor(platform, kind, expectedHandle);
    const tab = await chromeApi.tabs.create({ url: route, active: true });
    try {
      await waitForTab(chromeApi, tab.id);
      let identity;
      for(let attempt=0;attempt<20;attempt++) {
        identity=await execute(chromeApi,tab.id,platform==='threads'?readThreadsIdentityDocument:readXIdentityDocument);
        if(identity?.handle||isCancelled()) break;
        await wait(500);
      }
      if (normalizedHandle(identity?.handle) !== normalizedHandle(expectedHandle)) {
        const error = new Error('Authenticated account changed; reconnect this Chrome profile');
        error.code = 'account_mismatch';
        throw error;
      }
      const verifyIdentity=async()=>{
      const verified = await execute(chromeApi, tab.id, platform==='threads'?readThreadsIdentityDocument:readXIdentityDocument);
      if (normalizedHandle(verified?.handle) !== normalizedHandle(expectedHandle)) {
        const error = new Error('Authenticated account changed before ingest');
        error.code = 'account_mismatch';
        throw error;
      }
      };
      const saved=await collectTab(chromeApi,tab.id,platform,surfaceFor(platform,kind),limit,request,{
        wait,isCancelled,verifyIdentity,
        onProgress:async progress=>{
          const trace={...progress,kind,total:summary.items+progress.count};
          await onProgress(trace);
          await request('health',{collectionTrace:{...trace,recordedAt:new Date().toISOString(),platform}});
        },
        saveBatch:items=>request('ingest', {
        installationId,
        platform,
        authenticatedIdentity: expectedHandle,
        kind,
        items,
      }),
      });
      summary.items += saved.count;
      summary.streams.push({kind,...saved});
      await request('health',{collectionTrace:{platform,kind,...saved,stage:'finished',recordedAt:new Date().toISOString()}});
    } catch(error) {
      await request('health',{collectionTrace:{platform,kind,stage:'failed',error:error.message,recordedAt:new Date().toISOString()}}).catch(()=>{});
      throw error;
    } finally {
      await chromeApi.tabs.remove(tab.id).catch(() => {});
    }
  }
  return summary;
}

async function defaultActiveTab(chromeApi) {
  return (await chromeApi.tabs.query({ active: true, currentWindow: true }))[0] ?? null;
}

export function createController({
  chromeApi = globalThis.chrome,
  storage = chromeApi?.storage?.local,
  alarms = chromeApi?.alarms,
  activeTab = () => defaultActiveTab(chromeApi),
  readIdentity = (tab, platform) => readIdentityFromTab(chromeApi, tab.id, platform),
  request = nativeRequest,
  collect = (platform, kinds, limit, expectedHandle, options={}) => collectPlatform(platform, kinds, limit, { chromeApi, expectedHandle, request, ...options }),
} = {}) {
  let job={status:'idle',total:0};
  let cancelled=false;
  async function currentPlatform() {
    const tab = await activeTab();
    const platform = detectPlatform(tab);
    if (!platform) throw new Error('Open X or Threads in this Chrome profile first');
    return { tab, platform };
  }

  async function ensureDailyAlarm() {
    const enabled = (await storage.get(DAILY_KEY))[DAILY_KEY] === true;
    if (enabled) await alarms.create(DAILY_ALARM, { delayInMinutes: 1440, periodInMinutes: 1440 });
    else await alarms.clear(DAILY_ALARM);
  }

  async function handleUnsafe(message) {
    if(message?.type==='get-job') return job;
    if(message?.type==='stop-collection') { cancelled=true;return job; }
    if(message?.type==='set-collection-limit') {
      parseCollectionLimit(message.limit);
      await storage.set({'social-memory:collection-limit':message.limit});
      return {limit:message.limit};
    }
    if(message?.type==='start-collection') {
      if(job.status==='running') throw new Error('已有采集任务运行，请等待或停止');
      const limit=message.limit??100;parseCollectionLimit(limit);
      const {platform}=await currentPlatform();
      const settings=(await storage.get(settingsKey(platform)))[settingsKey(platform)];
      if(!settings?.connected) throw new Error('Connect this Chrome profile first');
      cancelled=false;job={status:'running',total:0,limit,kind:null};
      // Keep native messaging open for the lifetime of the background job.
      const keepAlive=chromeApi?.runtime?.connectNative?.(HOST_NAME);
      Promise.resolve().then(()=>collect(platform,settings.selectedCaptureKinds,limit,settings.handle,{
        isCancelled:()=>cancelled,
        onProgress:progress=>{job={...job,...progress};},
      })).then(result=>{job={...job,status:cancelled?'cancelled':'done',total:result.items,result};})
        .catch(error=>{job={...job,status:'error',error:error.message};})
        .finally(()=>{try{keepAlive?.disconnect();}catch{}});
      return {started:true};
    }
    if (message?.type === 'get-state') {
      const { tab, platform } = await currentPlatform();
      const identity = await readIdentity(tab, platform);
      const settings = (await storage.get(settingsKey(platform)))[settingsKey(platform)] ?? null;
      let hostReady = true;
      try { await request('health', identity?.diagnostics ? {diagnostics:identity.diagnostics} : {}); } catch { hostReady = false; }
      return { platform, handle: identity?.handle ?? null, settings, hostReady, daily: (await storage.get(DAILY_KEY))[DAILY_KEY] === true, collectionLimit:(await storage.get('social-memory:collection-limit'))['social-memory:collection-limit']??100,job };
    }
    if (message?.type === 'connect') {
      if(job.status==='running') throw new Error('采集中，请先停止任务再修改采集类型');
      const { tab, platform } = await currentPlatform();
      const identity = await readIdentity(tab, platform);
      if (!identity?.handle) throw new Error('The signed-in account could not be detected');
      const selectedCaptureKinds = [...new Set(message.selectedCaptureKinds ?? [])];
      const installationId = await getInstallationId(storage);
      const result = await request('connect', { installationId, platform, authenticatedIdentity: identity.handle, selectedCaptureKinds });
      await storage.set({ [settingsKey(platform)]: { connected: true, handle: normalizedHandle(identity.handle), selectedCaptureKinds } });
      return result;
    }
    if (message?.type === 'collect-now') {
      if(job.status==='running') throw new Error('已有采集任务运行');
      const { platform } = await currentPlatform();
      const settings = (await storage.get(settingsKey(platform)))[settingsKey(platform)];
      if (!settings?.connected) throw new Error('Connect this Chrome profile first');
      const limit=message.limit??100;parseCollectionLimit(limit);
      return collect(platform, settings.selectedCaptureKinds, limit, settings.handle);
    }
    if (message?.type === 'set-daily') {
      await storage.set({ [DAILY_KEY]: message.enabled === true });
      await ensureDailyAlarm();
      return { enabled: message.enabled === true };
    }
    throw new Error('Unknown popup message');
  }

  async function handle(message) {
    try { return { ok: true, result: await handleUnsafe(message) }; }
    catch (error) { return { ok: false, error: error.message, code: error.code ?? 'request_failed' }; }
  }

  async function collectConnectedPlatforms() {
    if(job.status==='running') return;
    for (const platform of ['x', 'threads']) {
      const settings = (await storage.get(settingsKey(platform)))[settingsKey(platform)];
      if (!settings?.connected) continue;
      try { await collect(platform, settings.selectedCaptureKinds, 100, settings.handle); }
      catch (error) { console.error(`Social Memory ${platform} collection failed:`, error); }
    }
  }

  return Object.freeze({ handle, ensureDailyAlarm, collectConnectedPlatforms });
}

if (globalThis.chrome?.runtime?.onMessage) {
  const controller = createController();
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    controller.handle(message).then(sendResponse);
    return true;
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === DAILY_ALARM) void controller.collectConnectedPlatforms().catch(console.error);
  });
  chrome.runtime.onStartup.addListener(() => void controller.ensureDailyAlarm());
  chrome.runtime.onInstalled.addListener(() => void controller.ensureDailyAlarm());
}
