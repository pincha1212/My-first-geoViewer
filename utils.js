'use strict';

const el = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const imageUrl = file => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}`;

function safe(label, fn, fallback) {
  try { return fn(); } catch (error) {
    console.error(`[Geovisor] ${label}`, error);
    if (typeof fallback === 'function') { try { return fallback(error); } catch (_) {} }
    return undefined;
  }
}

function safeAsync(label, fn) {
  return Promise.resolve().then(fn).catch(error => { console.error(`[Geovisor] ${label}`, error); return null; });
}
