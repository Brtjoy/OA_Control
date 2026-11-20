// Service worker do Gota Azul
// - Página: busca na internet primeiro; sem internet usa a cópia salva.
// - Recebe os avisos (Web Push) enviados pelo controlador e mostra a notificação.
// Ao publicar uma versão nova, aumente o número abaixo.
const CACHE = 'gota-azul-v15';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './badge.png'];

self.addEventListener('install', e => {
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
  const caminho = new URL(req.url).pathname;
  const pagina = req.mode === 'navigate' || /\.(html|json|js)$/.test(caminho) || caminho.endsWith('/');
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

// ---------- Avisos vindos do controlador ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { t: 'Gota Azul', b: e.data ? e.data.text() : '' }; }
  const titulo = d.t || 'Gota Azul';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.b || '',
    icon: 'icon-192.png',
    badge: 'badge.png',
    tag: 'gota-' + (d.ts || Date.now()),
    timestamp: d.ts ? (d.ts * 1000 + new Date().getTimezoneOffset() * 60000) : Date.now(),
    vibrate: [120, 60, 120]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const abertas = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) if ('focus' in c) return c.focus();
    return clients.openWindow('./');
  })());
});
