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
    // Registrar apenas em produção para evitar prompts durante o desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      return;
    }
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      console.log('[SW] Registering service worker...');
      // Usar o mesmo caminho do provider central
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('[SW] Service worker registered successfully:', registration);

      // Reload only when the new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        // Evitar reload imediato durante navegação (ex.: /login)
        // Aguarda um pequeno intervalo para finalizar requisições em curso
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker available');
              // Notificar usuário e acionar atualização de forma segura
              showUpdateNotification(registration);
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
  
  const showUpdateNotification = (registration: ServiceWorkerRegistration) => {
    // Evitar repetição: mostrar apenas uma vez por sessão
    const sessionKey = 'sw_update_prompted';
    const dismissedKey = 'sw_update_dismissed';
    if (sessionStorage.getItem(sessionKey) || sessionStorage.getItem(dismissedKey)) {
      return;
    }
    sessionStorage.setItem(sessionKey, '1');

    // Delegar ao fluxo central: abrir modal através do Provider
    // O Provider escuta a detecção e abre o modal; aqui garantimos o evento
    try {
      window.dispatchEvent(new Event('sw-new-version'));
    } catch (e) {
      console.log('[SW] Nova versão detectada. Aguarde prompt de atualização.');
    }

    // Como fallback, se o modal não estiver ativo, permitir atualizar manualmente
    // (não bloquear com confirm para evitar loop)
    if (registration.waiting) {
      // O modal dispara 'sw-skip-waiting'; se não vier, manter sem ação
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