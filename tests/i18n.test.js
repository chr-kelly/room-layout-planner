import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, setLocale, getLocale, t, formatNumber, localePath, readPreference, writePreference, displayName } from '../src/i18n.js';
import en from '../src/locales/en.js';
import { exampleProject, validateProject, clone, number } from '../src/model.js';
import { message } from '../src/messages.js';

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

test('renamed or forged default-name markers are ignored without changing user text', async () => {
  const p=exampleProject();p.name='My plan';p.furniture[0].name='My sofa';p.furniture[1].nameKey='ui.confirm';
  const clean=validateProject(p);
  assert.equal(clean.name,'My plan');assert.equal(clean.nameKey,undefined);
  assert.equal(clean.furniture[0].name,'My sofa');assert.equal(clean.furniture[0].nameKey,undefined);
  assert.equal(clean.furniture[1].nameKey,undefined);
  await setLocale('ja');assert.equal(displayName({name:'私の家具',nameKey:99}),'私の家具');await setLocale('en');
});

test('core validation retains its English message and exposes structured translated parameters', async () => {
  let error;try{number(-1,message('ui.width'),.01,100);}catch(e){error=e;}
  assert.equal(error.code,'error.numberRange');assert.equal(error.message,'Width must be a finite number between 0.01 and 100.');
  await setLocale('fr');assert.equal(t(error.code,error.params),'Largeur doit être un nombre fini entre 0,01 et 100.');await setLocale('en');
});
