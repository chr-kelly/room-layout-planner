import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { LOCALES } from '../src/i18n.js';

test('all six static entries have translated metadata and real relative asset/language paths', async () => {
  for(const {code} of LOCALES){
    const entry=new URL(code==='en'?'../index.html':`../${code}/index.html`,import.meta.url);
    const html=await readFile(entry,'utf8');const {default:copy}=await import(`../src/locales/${code}.js`);
    assert.ok(html.includes(`<html lang="${code}">`),code);
    assert.ok(html.includes(copy['ui.room_layout_planner_make_room_for_what_matters']),code);
    assert.ok(html.includes("connect-src 'none'"),code);
    assert.equal([...html.matchAll(/rel="alternate" hreflang=/g)].length,7,code);
    for(const [,reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(reference.startsWith('#'))continue;
      const url=new URL(reference,entry);
      await access(url.pathname.endsWith('/')?new URL('index.html',url):url);
    }
    assert.ok(!html.includes('/en/'),code);
  }
});
