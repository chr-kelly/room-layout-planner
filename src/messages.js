import en from './locales/en.js';

/** Stable message descriptors let validation stay independent of the browser. */
export function message(key, params = {}) {
  return Object.freeze({ messageKey: key, params });
}
export function isMessage(value) {
  return Boolean(value && typeof value === 'object' && typeof value.messageKey === 'string');
}
export function english(value) {
  if (!isMessage(value)) return String(value ?? '');
  const template = en[value.messageKey] ?? value.messageKey;
  return template.replace(/\{(\w+)\}/g, (_, key) => english(value.params[key]));
}
export class PlannerError extends Error {
  constructor(code, params = {}) {
    super(english(message(code, params)));
    this.name = 'PlannerError';
    this.code = code;
    this.params = params;
  }
}
