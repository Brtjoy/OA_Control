// Service worker do Irrigador
// - Página (HTML/manifest): busca SEMPRE na internet primeiro; só usa a cópia
//   salva se estiver sem internet (ou a rede demorar mais de 4 s).
// - Ícones: usa a cópia salva.
// Ao publicar uma versão nova, aumente o número abaixo.
const CACHE = 'irrigador-v5';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // cache:'reload' ignora o cache HTTP do navegador e baixa a versão nova de verdade
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

function comPrazo(p, ms){ return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const pagina = req.mode === 'navigate' || /\.(html|json)$/.test(new URL(req.url).pathname) || new URL(req.url).pathname.endsWith('/');

  if (pagina){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const r = await comPrazo(fetch(req, { cache: 'no-store' }), 4000);
        if (r.ok) cache.put(req, r.clone());
        return r;
      } catch {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
      }
    })());
  } else {
    e.respondWith(caches.match(req).then(salvo => salvo || fetch(req)));
  }
});
