import en from './locales/en.js';
import { message, isMessage } from './messages.js';

export { message };
export const LOCALES = Object.freeze([
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' }
]);
const loaders = {
  en: async () => ({ default: en }),
  'zh-TW': () => import('./locales/zh-TW.js'),
  ja: () => import('./locales/ja.js'),
  de: () => import('./locales/de.js'),
  fr: () => import('./locales/fr.js'),
  es: () => import('./locales/es.js')
};
const preferenceKey = 'room-layout-planner.ui.language.v1';
const listeners = new Set(), bindings = new Map(), numberFormats = new Map();
let locale = 'en', dictionary = en, request = 0;
export const getLocale = () => locale;
export const basePath = new URL('../', import.meta.url).pathname;
export function formatNumber(number, precision = 3) {
  const key=`${locale}:${precision}`;
  if(!numberFormats.has(key))numberFormats.set(key,new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: precision }));
  return numberFormats.get(key).format(number);
}
export function t(key, params = {}) {
  return (dictionary[key] ?? en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => {
    const value = params[name];
    return typeof value === 'number' ? formatNumber(value, 6) : resolve(value);
  });
}
export function resolve(value) {
  if (typeof value === 'function') return resolve(value());
  return isMessage(value) ? t(value.messageKey, value.params) : String(value ?? '');
}
export async function setLocale(code) {
  if (!Object.hasOwn(loaders, code)) throw new Error('Unsupported UI language.');
  const token = ++request;
  const { default: next } = await loaders[code]();
  if (token !== request) return locale;
  dictionary = next;
  locale = code;
  refreshBindings();
  for (const listener of listeners) listener(code);
  return locale;
}
export function onLocaleChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function readPreference(storageFactory = () => globalThis.localStorage) {
  try {
    const code = storageFactory().getItem(preferenceKey);
    return Object.hasOwn(loaders, code) ? code : null;
  } catch { return null; }
}
export function writePreference(code, storageFactory = () => globalThis.localStorage) {
  if (!Object.hasOwn(loaders, code)) return false;
  try { storageFactory().setItem(preferenceKey, code); return true; }
  catch { return false; }
}
export function localePath(code, base = '/') {
  if (!Object.hasOwn(loaders, code)) throw new Error('Unsupported UI language.');
  const prefix = `${base.replace(/\/+$/, '')}/`;
  return prefix + (code === 'en' ? '' : `${code}/`);
}
function updateLocation() {
  if (!globalThis.document) return;
  document.documentElement.lang = locale;
  document.title = t('ui.room_layout_planner_make_room_for_what_matters');
  const path = localePath(locale, basePath);
  if (location.pathname !== path) history.replaceState(null, '', path + location.search + location.hash);
}
export async function initializeLocale() {
  // replaceState changes the document base URL. Freeze relative navigation/assets
  // before changing paths so icons, styles and the home link keep their real base.
  for(const node of document.querySelectorAll('link[href],a.brand[href]')){
    const url=new URL(node.getAttribute('href'),location.href);
    if(url.origin===location.origin)node.setAttribute('href',url.href);
  }
  const pathCode = location.pathname.slice(basePath.length).split('/')[0];
  const explicit = pathCode && Object.hasOwn(loaders, pathCode);
  const code = explicit ? pathCode : readPreference() || 'en';
  try { await setLocale(code); }
  catch { await setLocale('en'); }
  updateLocation();
}
export async function changeLocale(code) {
  await setLocale(code);
  writePreference(locale);
  updateLocation();
}
export function suggestedLocale(languages = globalThis.navigator?.languages ?? []) {
  if (readPreference()) return null;
  for (const language of languages) {
    const code = language.startsWith('zh') ? 'zh-TW' : language.split('-')[0];
    if (Object.hasOwn(loaders, code)) return code === locale ? null : LOCALES.find(l => l.code === code);
  }
  return null;
}
function remember(node, property, value) {
  if (!bindings.has(node)) bindings.set(node, new Map());
  bindings.get(node).set(property, value);
  if (property === 'text') node.textContent = resolve(value);
  else node.setAttribute(property, resolve(value));
  return node;
}
export const bindText = (node, value) => remember(node, 'text', value);
export const bindAttribute = (node, attribute, value) => remember(node, attribute, value);
export function refreshBindings() {
  for (const [node, values] of bindings) {
    if (!node.isConnected) { bindings.delete(node); continue; }
    for (const [property, value] of values) {
      if (property === 'text') node.textContent = resolve(value);
      else node.setAttribute(property, resolve(value));
    }
  }
}
export function pruneBindings() {for(const node of bindings.keys())if(!node.isConnected)bindings.delete(node);}
export function translateDOM(root = document) {
  for (const node of root.querySelectorAll('[data-i18n]')) bindText(node, message(node.dataset.i18n));
  for (const attribute of ['aria-label', 'title', 'content']) {
    for (const node of root.querySelectorAll(`[data-i18n-${attribute}]`)) bindAttribute(node, attribute, message(node.getAttribute(`data-i18n-${attribute}`)));
  }
}
export function nameMessage(item) {
  return typeof item?.nameKey==='string' && item.nameKey.startsWith('name.') && Object.hasOwn(en, item.nameKey) && item.name === en[item.nameKey]
    ? message(item.nameKey) : item?.name ?? '';
}
export const displayName = item => resolve(nameMessage(item));
export function errorMessage(error) {
  return error?.code && Object.hasOwn(en, error.code) ? message(error.code, error.params) : message('ui.something_went_wrong_your_project_was_not_replaced');
}
/** Display formatting never changes the canonical metre geometry or numeric fields. */
export function formatLength(meters, units = 'metric', precision = 3) {
  if (units === 'metric') return `${formatNumber(meters, precision)} ${t('units.metres')}`;
  const sign = meters < 0 ? '−' : '';
  let feet = Math.floor(Math.abs(meters) / 0.3048);
  let inches = Math.round((Math.abs(meters) / 0.3048 - feet) * 1200) / 100;
  if (inches === 12) { feet++; inches = 0; }
  return `${sign}${formatNumber(feet, 0)} ${t('units.feet')} ${formatNumber(inches, 2)} ${t('units.inches')}`;
}
