import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LOCALES } from '../src/i18n.js';

const root = new URL('../', import.meta.url);
const source = (await readFile(new URL('index.html', root), 'utf8')).replace(/\s*<!-- Locale links -->[\s\S]*?<!-- End locale links -->/g, '');
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
for (const { code } of LOCALES) {
  const { default: messages } = await import(`../src/locales/${code}.js`);
  let html = source.replace(/<html lang="[^"]+">/, `<html lang="${code}">`);
  html = html.replace(/<([\w-]+)([^>]*\bdata-i18n="([^"]+)"[^>]*)>[^<]*<\/\1>/g, (all, tag, attrs, key) => {
    if (!Object.hasOwn(messages, key)) throw new Error(`Missing ${code}:${key}`);
    return `<${tag}${attrs}>${escape(messages[key])}</${tag}>`;
  });
  html = html.replace(/<[^>]+>/g, tag => {
    for (const attribute of ['aria-label','title','content']) {
      const key = tag.match(new RegExp(`data-i18n-${attribute}="([^"]+)"`))?.[1];
      if (key) {
        if (!Object.hasOwn(messages, key)) throw new Error(`Missing ${code}:${key}`);
        tag = tag.replace(new RegExp(`(?<![\\w-])${attribute}="[^"]*"`), `${attribute}="${escape(messages[key])}"`);
      }
    }
    return tag;
  });
  if (code !== 'en') html = html.replace(/\b(href|src)="\.\//g, '$1="../');
  const prefix = code === 'en' ? './' : '../';
  const links = LOCALES.map(l => `  <link rel="alternate" hreflang="${l.code}" href="${prefix}${l.code === 'en' ? '' : l.code + '/'}">`).join('\n');
  html = html.replace('</head>', `  <!-- Locale links -->\n${links}\n  <link rel="alternate" hreflang="x-default" href="${prefix}">\n  <!-- End locale links -->\n</head>`);
  const directory = new URL(code === 'en' ? './' : `${code}/`, root);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('index.html', directory), html);
  console.log(`${code}: ${fileURLToPath(new URL('index.html', directory))}`);
}
