import test from 'node:test';
import assert from 'node:assert/strict';
import {messages,resolveLanguage,translate,translateError} from '../extension/popup-i18n.js';
test('automatic language follows Chinese region, Korean, Japanese and English fallback',()=>{
 assert.equal(resolveLanguage('auto','zh-HK'),'zh-TW');
 assert.equal(resolveLanguage('auto','zh-CN'),'zh-CN');
 assert.equal(resolveLanguage('auto','ko-KR'),'ko');
 assert.equal(resolveLanguage('auto','ja-JP'),'ja');
 assert.equal(resolveLanguage('auto','fr-FR'),'en');
 assert.equal(resolveLanguage('ja','en-US'),'ja');
});
test('all interface languages provide the same keys and preserve dynamic values',()=>{
 const keys=Object.keys(messages.en).sort();
 for(const language of ['zh-CN','zh-TW','en','ko','ja']) {
  assert.deepEqual(Object.keys(messages[language]).sort(),keys);
  assert.match(translate(language,'running',{count:123,kind:'test'}),/123/);
  assert.ok(translateError(language,'The signed-in account could not be detected'));
 }
 assert.equal(translate('ko','collect'),'지금 수집');
 assert.equal(translate('ja','collect'),'今すぐ収集');
});
