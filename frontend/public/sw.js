const CACHE_NAME = 'melitus-gym-v1';
const STATIC_CACHE_NAME = 'melitus-gym-static-v1';
const MODEL_CACHE_NAME = 'melitus-gym-models-v1';

// URLs to cache on install
const STATIC_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg'
];

// TensorFlow.js and COCO-SSD model URLs
const MODEL_URLS = [
  'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1/model.json',
  'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json',
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@latest/dist/coco-ssd.min.js'
];

// Install event - cache static assets and models
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_URLS);
      }),
      
      // Cache model assets
      caches.open(MODEL_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching model assets');
        return Promise.allSettled(
          MODEL_URLS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache model URL: ${url}`, err);
              return null;
            })
          )
        );
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== MODEL_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle model requests with cache-first strategy
  if (isModelRequest(request.url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving model from cache:', request.url);
          return cachedResponse;
        }
        
        console.log('[SW] Fetching model from network:', request.url);
        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(MODEL_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch((error) => {
          console.error('[SW] Model fetch failed:', request.url, error);
          throw error;
        });
      })
    );
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
    );
    return;
  }
  
  // Handle API requests with network-first strategy
  if (isApiRequest(request.url)) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return cached response if network fails
        return caches.match(request);
      })
    );
    return;
  }
  
  // Default: network-first for everything else
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Helper functions
function isModelRequest(url) {
  return url.includes('tfhub.dev') || 
         url.includes('tensorflow') ||
         url.includes('tfjs') ||
         url.includes('coco-ssd') ||
         url.includes('model.json') ||
         url.includes('.bin');
}

function isStaticAsset(url) {
  return url.includes('.js') ||
         url.includes('.css') ||
         url.includes('.svg') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.ico') ||
         url.includes('manifest.json');
}

function isApiRequest(url) {
  return url.includes('/api/') || url.includes('127.0.0.1:8000');
}

// Background sync for offline nutrition data
self.addEventListener('sync', (event) => {
  if (event.tag === 'nutrition-sync') {
    event.waitUntil(
      syncNutritionData()
    );
  }
});

// Sync nutrition data when back online
async function syncNutritionData() {
  try {
    // Get pending nutrition data from IndexedDB
    const pendingData = await getPendingNutritionData();
    
    if (pendingData.length > 0) {
      console.log('[SW] Syncing pending nutrition data:', pendingData.length, 'items');
      
      for (const data of pendingData) {
        try {
          await fetch('/api/nutrition/analyze', {
            method: 'POST',
            body: data.formData
          });
          
          // Remove from pending after successful sync
          await removePendingNutritionData(data.id);
        } catch (error) {
          console.error('[SW] Failed to sync nutrition data:', error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// IndexedDB helpers for offline storage
async function getPendingNutritionData() {
  // Placeholder - implement IndexedDB logic
  return [];
}

async function removePendingNutritionData(id) {
  // Placeholder - implement IndexedDB logic
  console.log('[SW] Removing pending data:', id);
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MODEL') {
    event.waitUntil(
      caches.open(MODEL_CACHE_NAME).then((cache) => {
        return cache.add(event.data.url);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});