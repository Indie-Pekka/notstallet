// Bygger Notstället av samma källfil som Claude-artefakten (bygg/notstallet.html).
//
//   node bygg/build-pwa.mjs <utmapp> <version> [pwa|wix]
//
//   pwa (standard): Hugos hemskärmsapp – allt sparas på iPaden, service worker gör den helt offline.
//                   Byggs i repots rot:  node bygg/build-pwa.mjs . 2026.11.21a
//   wix:            medlemsläget som visas på hemsidan (noter, låtlistor och anteckningar kommer från hemsidan).
//                   Byggs i mappen medlem/:  node bygg/build-pwa.mjs medlem 2026.11.21a wix
//
// pdf.js (legacy-bygget) hämtas från pdfjs-dist, ikonerna görs med sharp (bara pwa).
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import url from 'url';
const require = createRequire('/opt/npm-tools/node_modules/');
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'notstallet.html'), ICON = path.join(HERE, 'icon.svg');
const PDFJS = path.dirname(require.resolve('pdfjs-dist/package.json'));
const OUT = path.resolve(process.argv[2] || path.join(HERE, '..'));
const version = process.argv[3] || new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
const MODE = process.argv[4] || 'pwa';
if (!['pwa', 'wix'].includes(MODE)) throw new Error('Läget ska vara pwa eller wix');

fs.mkdirSync(OUT, { recursive: true });
for (const d of ['wasm', 'standard_fonts']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
fs.copyFileSync(path.join(PDFJS, 'legacy/build/pdf.min.mjs'), path.join(OUT, 'pdf.min.mjs'));
fs.copyFileSync(path.join(PDFJS, 'legacy/build/pdf.worker.min.mjs'), path.join(OUT, 'pdf.worker.min.mjs'));
for (const f of fs.readdirSync(path.join(PDFJS, 'wasm'))) if (/\.(wasm|js)$/.test(f)) fs.copyFileSync(path.join(PDFJS, 'wasm', f), path.join(OUT, 'wasm', f));
for (const f of fs.readdirSync(path.join(PDFJS, 'standard_fonts'))) fs.copyFileSync(path.join(PDFJS, 'standard_fonts', f), path.join(OUT, 'standard_fonts', f));
fs.copyFileSync(path.join(PDFJS, 'LICENSE'), path.join(OUT, 'LICENSE-pdfjs.txt'));

let html = fs.readFileSync(SRC, 'utf8');
const must = (a, b) => { if (!html.includes(a)) throw new Error('saknas: ' + a); html = html.replace(a, b); };
must("const APP_MODE = 'artifact';", `const APP_MODE = '${MODE}';`);
must("const APP_VERSION = 'dev';", `const APP_VERSION = '${version}';`);

if (MODE === 'wix') {
  // Medlemsläget: ingen hemskärmsapp, ingen service worker. Visas bara inuti hemsidan.
  must('<!--PWA-HEAD-->', `<meta name="robots" content="noindex">`);
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  console.log('Byggd', OUT, 'version', version, 'läge wix');
  process.exit(0);
}

const sharp = require('sharp');
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
const svg = fs.readFileSync(ICON);
for (const [n, s] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) await sharp(svg).resize(s, s).png().toFile(path.join(OUT, 'icons', n));
must('<!--PWA-HEAD-->', `<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#f5f2ec">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Notstället">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="icons/favicon-32.png">`);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Notstället', short_name: 'Notstället', description: 'Notvisning med anteckningar, låtlistor och metronom',
  lang: 'sv', start_url: './', scope: './', display: 'standalone', orientation: 'any',
  background_color: '#f5f2ec', theme_color: '#f5f2ec',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
}, null, 2));
// service worker med alla filer i cachen (inte bygg/ och inte medlemsläget i medlem/)
const SKIP_DIRS = new Set(['bygg', 'medlem', '.git', 'node_modules']);
const files = [];
const walk = d => { for (const f of fs.readdirSync(path.join(OUT, d))) { const p = path.join(d, f); if (fs.statSync(path.join(OUT, p)).isDirectory()) { if (!(d === '' && SKIP_DIRS.has(f))) walk(p); } else files.push(p); } };
walk('');
const precache = ['./', ...files.filter(f => !/^(sw\.js|README\.md|\.nojekyll|LICENSE)/.test(f)).map(f => './' + f.split(path.sep).join('/'))];
fs.writeFileSync(path.join(OUT, 'sw.js'), `// Notstället – service worker. Gör appen tillgänglig helt utan nät.
const VERSION = '${version}';
const CACHE = 'notstallet-' + VERSION;
const FILES = ${JSON.stringify(precache, null, 0)};
// Medlemsläget i medlem/ är en egen app som visas på hemsidan – den ska aldrig få hemskärmsappens filer
const SCOPE_SKIP = new URL('./medlem/', self.registration.scope).pathname;
// cache: 'reload' – hämta alltid färskt från servern, inte ur webbläsarens minne (GitHub Pages låter filer ligga kvar i 10 min)
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith(SCOPE_SKIP)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
    if (hit) return hit;
    try { return await fetch(req); } catch { return new Response('Offline', { status: 503 }); }
  })());
});
`);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'README.md'), `# Notstället

Hugos notvisningsapp för iPad: pdf-noter med anteckningar (Apple Pencil), låtlistor i mappar, bläddringspunkter, zoom och metronom.
Allt sparas lokalt på iPaden. Appen fungerar helt offline när den väl är installerad.

**Installera:** öppna https://indie-pekka.github.io/notstallet/ i Safari på iPaden → dela-knappen → *Lägg till på hemskärmen*.

Version ${version}. Byggd av samma källkod som Claude-artefakten "Notstället". pdf.js (Apache 2.0) ingår, se LICENSE-pdfjs.txt.

## Medlemsläget (medlem/)

Mappen \`medlem/\` är samma app i medlemsläge (\`APP_MODE = 'wix'\`). Den visas i en helskärmsruta på popkörernas låtsida
(Enstöring produktion) och får noter, konserternas låtlistor och medlemmens egna anteckningar från hemsidan.
Medlemmen läser och antecknar men kan inte ladda upp, ändra eller ta bort något.

## Bygga

Källan är \`bygg/notstallet.html\` (artefaktläget). Allt annat byggs från den:

\`\`\`
node bygg/build-pwa.mjs . <version>             # hemskärmsappen i roten
node bygg/build-pwa.mjs medlem <version> wix    # medlemsläget
\`\`\`
`);
console.log('Byggd', OUT, 'version', version, 'filer i cache:', precache.length);
