import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LOCALES, setLocale, getLocale, t, formatNumber, localePath, readPreference, writePreference, displayName } from '../src/i18n.js';
import en from '../src/locales/en.js';
import { blankProject, exampleProject, validateProject, clone } from '../src/model.js';

test('six published languages have complete text and matching interpolation variables', async () => {
  assert.deepEqual(LOCALES.map(l => l.code), ['en','zh-TW','ja','de','fr','es']);
  const keys = Object.keys(en).sort();
  const vars = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const {code} of LOCALES) {
    const {default: messages} = await import(`../src/locales/${code}.js`);
    assert.deepEqual(Object.keys(messages).sort(), keys, code);
    for (const key of keys) { assert.ok(messages[key].trim(), `${code}:${key}`); assert.deepEqual(vars(messages[key]), vars(en[key]), `${code}:${key}`); }
  }
});

test('explicit languages translate variable errors and preserve literal user content', async () => {
  for (const {code} of LOCALES) {
    await setLocale(code);
    assert.equal(getLocale(),code);
    assert.ok(t('error.numberRange', {label:'我的家具 <b>',min:1,max:3}).includes('我的家具 <b>'));
  }
  await assert.rejects(setLocale('unsupported'));
  assert.equal(getLocale(),'es');
  await setLocale('en');
});

test('language paths work on root and GitHub-style base paths', () => {
  assert.equal(localePath('en','/'),'/');
  assert.equal(localePath('zh-TW','/'),'/zh-TW/');
  assert.equal(localePath('ja','/room-layout-planner/'),'/room-layout-planner/ja/');
  assert.equal(localePath('en','/room-layout-planner/'),'/room-layout-planner/');
});

test('locale preferences fail safely when storage is denied and never access the project key', () => {
  const unavailable=()=>{throw new Error('SecurityError');};
  assert.equal(readPreference(unavailable),null);
  assert.equal(writePreference('ja',unavailable),false);
  const touched=[];let value;
  const factory=()=>({setItem:(k,v)=>{touched.push(k);value=v;},getItem:k=>{touched.push(k);return value;}});
  assert.equal(writePreference('de',factory),true);assert.equal(readPreference(factory),'de');
  assert.ok(touched.every(k=>k==='room-layout-planner.ui.language.v1'));
});

test('locale display handles decimal commas while stored geometry and units stay unchanged', async () => {
  const p=exampleProject('imperial'),before=clone(p);
  await setLocale('de'); assert.equal(formatNumber(2.25),'2,25');
  await setLocale('fr'); assert.equal(formatNumber(2.25),'2,25');
  await setLocale('en'); assert.equal(formatNumber(2.25),'2.25');
  assert.deepEqual(p,before);
});

test('only explicit default-name metadata is translated and old/custom names roundtrip literally', async () => {
  const old={...exampleProject(),name:'Living + working'};delete old.nameKey;
  for (const item of old.furniture)delete item.nameKey;
  const tagged=exampleProject();const user={...tagged.furniture[0],name:'Sofa'};delete user.nameKey;
  await setLocale('zh-TW');
  assert.equal(displayName(old),old.name);
  assert.equal(displayName(old.furniture[0]),'Sofa');
  assert.equal(displayName(user),'Sofa');
  assert.equal(displayName(tagged.furniture[0]),'沙發');
  assert.deepEqual(validateProject(old),old);
  assert.deepEqual(validateProject(tagged),tagged);
  await setLocale('en');
});
