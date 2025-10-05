'use client';

import { useEffect } from 'react';

// Extend ServiceWorkerRegistration interface to include sync property
declare global {
  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }
  
  interface SyncManager {
    register(tag: string): Promise<void>;
  }
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[SW] Registering service worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[SW] Service worker registered successfully:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker available');
              // Optionally show update notification to user
              showUpdateNotification();
            }
          });
        }
      });
      
      // Pre-cache TensorFlow.js models
      if (registration.active) {
        preCacheModels(registration);
      }
      
    } catch (error) {
      console.error('[SW] Service worker registration failed:', error);
    }
  };
  
  const preCacheModels = (registration: ServiceWorkerRegistration) => {
    const modelUrls = [
      'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1/model.json',
      'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json'
    ];
    
    modelUrls.forEach(url => {
      registration.active?.postMessage({
        type: 'CACHE_MODEL',
        url: url
      });
    });
    
    console.log('[SW] Requested pre-caching of model assets');
  };
  
  const showUpdateNotification = () => {
    // Simple notification - could be enhanced with a toast component
    if (window.confirm('Nova versão disponível! Deseja atualizar?')) {
      window.location.reload();
    }
  };
  
  return null; // This component doesn't render anything
}

// Utility functions for interacting with service worker
export const serviceWorkerUtils = {
  // Clear all caches
  clearCache: () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
    }
  },
  
  // Check if app is running in standalone mode (PWA)
  isStandalone: () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  },
  
  // Request background sync for offline data
  requestSync: (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as any).sync.register(tag);
      }).catch((error) => {
        console.error('[SW] Background sync registration failed:', error);
      });
    }
  },
  
  // Store nutrition data for offline sync
  storeOfflineNutritionData: async (data: FormData) => {
    // This would typically use IndexedDB
    // For now, we'll use localStorage as a simple fallback
    try {
      const offlineData = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        data: Array.from(data.entries())
      };
      
      const existing = JSON.parse(localStorage.getItem('offline_nutrition_data') || '[]');
      existing.push(offlineData);
      localStorage.setItem('offline_nutrition_data', JSON.stringify(existing));
      
      // Request background sync
      serviceWorkerUtils.requestSync('nutrition-sync');
      
      console.log('[SW] Stored nutrition data for offline sync');
    } catch (error) {
      console.error('[SW] Failed to store offline nutrition data:', error);
    }
  }
};