// Service Worker para Melitus Gym
// Versão: 2025-01-25-1 (atualizar a cada build)
const SW_VERSION = '2025-01-25-1';
const CACHE_NAME = `melitus-gym-v${SW_VERSION}`;

// Arquivos essenciais para cache
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.svg'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${SW_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch(err => {
        console.warn('[SW] Cache installation failed:', err);
      })
  );
  
  // NÃO chamar self.skipWaiting() automaticamente
  // Aguardar comando explícito da UI
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version ${SW_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Assumir controle de todas as abas
      self.clients.claim()
    ])
  );
});

// Interceptar requisições de rede
self.addEventListener('fetch', (event) => {
  // Estratégia: Network First para HTML, Cache First para assets estáticos
  if (event.request.destination === 'document') {
    // Network First para páginas HTML
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se a rede funcionar, usar resposta da rede
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone))
            .catch(() => {});
          return response;
        })
        .catch(() => {
          // Se a rede falhar, tentar cache
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || new Response('Offline', { status: 503 });
            });
        })
    );
  } else {
    // Cache First para assets estáticos
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              // Cachear apenas respostas válidas
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseClone))
                  .catch(() => {});
              }
              return response;
            })
            .catch(() => {
              // Fallback para recursos não encontrados
              return new Response('Resource not available offline', { status: 503 });
            });
        })
    );
  }
});

// Aplicar update somente quando a UI mandar
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event?.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting and taking control');
    self.skipWaiting();
  }
});

// Log de controle para debug
self.addEventListener('controllerchange', () => {
  console.log('[SW] Controller changed');
});

console.log(`[SW] Service Worker ${SW_VERSION} loaded`);