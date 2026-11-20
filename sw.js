// Service worker: guarda a página no celular para abrir sem internet.
// Ao publicar uma versão nova da página, aumente o número abaixo.
const CACHE = 'irrigador-v2';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Responde na hora com a cópia salva e, se houver internet, atualiza em segundo plano
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const salvo = await cache.match(e.request, { ignoreSearch: true });
    const rede = fetch(e.request).then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => salvo);
    return salvo || rede;
  }));
});
