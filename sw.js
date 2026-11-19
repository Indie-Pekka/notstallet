// Notstället – service worker. Gör appen tillgänglig helt utan nät.
const VERSION = '2026.11.19c';
const CACHE = 'notstallet-' + VERSION;
const FILES = ["./","./icons/apple-touch-icon.png","./icons/favicon-32.png","./icons/icon-192.png","./icons/icon-512.png","./index.html","./manifest.webmanifest","./pdf.min.mjs","./pdf.worker.min.mjs","./standard_fonts/FoxitDingbats.pfb","./standard_fonts/FoxitFixed.pfb","./standard_fonts/FoxitFixedBold.pfb","./standard_fonts/FoxitFixedBoldItalic.pfb","./standard_fonts/FoxitFixedItalic.pfb","./standard_fonts/FoxitSerif.pfb","./standard_fonts/FoxitSerifBold.pfb","./standard_fonts/FoxitSerifBoldItalic.pfb","./standard_fonts/FoxitSerifItalic.pfb","./standard_fonts/FoxitSymbol.pfb","./standard_fonts/LICENSE_FOXIT","./standard_fonts/LICENSE_LIBERATION","./standard_fonts/LiberationSans-Bold.ttf","./standard_fonts/LiberationSans-BoldItalic.ttf","./standard_fonts/LiberationSans-Italic.ttf","./standard_fonts/LiberationSans-Regular.ttf","./wasm/jbig2.wasm","./wasm/jbig2_nowasm_fallback.js","./wasm/openjpeg.wasm","./wasm/openjpeg_nowasm_fallback.js","./wasm/qcms_bg.wasm","./wasm/quickjs-eval.js","./wasm/quickjs-eval.wasm"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('Offline', { status: 503 }); }
  })());
});
