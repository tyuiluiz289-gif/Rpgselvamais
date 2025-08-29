
// Service Worker - cache estÃ¡tico + fallback offline + limpeza de versÃµes
const CACHE = 'rpg-turnos-explore-v203';

// PrÃ©-cache de tudo que seu app precisa offline (arquivos na RAIZ)
const CORE = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // imagens
  './narrator_messi.png',
  './quest_girl_pink.png',
  './villager_old.png',
  './player_portrait.png',
  './goblin_a.png',
  './goblin_b.png',
  './goblin_c.png',
  './wolf.png',
  './zombie.png',
  './miniboss_brutamontes.png',
  './bg_forest.png',
  './bg_school.png',
  './bg_bloodmoon.png',
  './bg_stadium.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE ? caches.delete(k) : undefined))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // SÃ³ tratamos GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === location.origin;

  // NavegaÃ§Ãµes (pÃ¡gina recarregada/aberta)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Tenta rede primeiro
          const network = await fetch(request);
          // Cacheia uma cÃ³pia do index (melhora PWA Builder)
          const cache = await caches.open(CACHE);
          cache.put('./index.html', network.clone());
          return network;
        } catch (err) {
          // Offline â†’ serve o index do cache
          const cached = await caches.match('./index.html');
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Mesma origem â†’ estratÃ©gia "stale-while-revalidate" bÃ¡sica
  if (sameOrigin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(network => {
          // atualiza o cache silenciosamente
          cache.put(request, network.clone()).catch(() => {});
          return network;
        }).catch(() => null);
        return cached || fetchPromise || new Response('Offline', { status: 503 });
      })()
    );
    return;
  }

  // Origem externa â†’ rede pura (evita CORS/opaque no cache)
  // Se quiser, pode trocar por "cache first" para assets CDN confiÃ¡veis
  // Aqui mantemos simples
});
