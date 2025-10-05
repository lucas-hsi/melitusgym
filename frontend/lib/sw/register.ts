export function setupServiceWorker(onNewVersion?: () => void) {
  if (!('serviceWorker' in navigator)) return;

  // Em dev, garantir que nenhum SW permaneça registrado
  if (process.env.NODE_ENV !== 'production') {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .then(() => caches?.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))))
      .catch(() => {});
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        let refreshing = false;

        // Reload apenas uma vez quando o novo SW assumir controle
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        function promptUpdate(worker: ServiceWorker) {
          // Garante que o prompt apareça uma única vez por sessão
          const sessionKey = 'sw_update_prompted';
          const dismissedKey = 'sw_update_dismissed';
          
          // Não mostrar se já foi exibido ou se foi dispensado pelo usuário
          if (sessionStorage.getItem(sessionKey) || sessionStorage.getItem(dismissedKey)) {
            return;
          }
          
          sessionStorage.setItem(sessionKey, '1');
          onNewVersion?.();
        }

        // Se já existe um SW em waiting, perguntar uma vez
        if (reg.waiting) promptUpdate(reg.waiting);

        // Detecta nova instalação e, quando virar "installed" com controller ativo, pergunta
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW?.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(newSW);
            }
          });
        });

        // Ouvir comando global para aplicar update (emitido pelo modal)
        window.addEventListener('sw-skip-waiting', () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        });
      })
      .catch(() => {});
  });
}

// Utilitário para desenvolvimento: desregistrar SW e limpar caches
export async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));
    
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    
    console.log('Service workers e caches removidos.');
  } catch (error) {
    console.error('Erro ao desregistrar service workers:', error);
  }
}

// Função para desenvolvimento: executar via DevTools
// Expor função globalmente apenas no cliente
if (typeof window !== 'undefined') {
  (window as any).unregisterSW = unregisterServiceWorkers;
}