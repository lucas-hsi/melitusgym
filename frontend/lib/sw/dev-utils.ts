// Utilitários para desenvolvimento do Service Worker

/**
 * Remove todos os Service Workers registrados e limpa todos os caches
 * Útil para desenvolvimento e testes
 */
export async function clearAllServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado neste navegador');
    return;
  }

  try {
    // Desregistrar todos os Service Workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregisterPromises = registrations.map(registration => {
      console.log('Desregistrando SW:', registration.scope);
      return registration.unregister();
    });
    
    await Promise.all(unregisterPromises);
    console.log(`${registrations.length} Service Worker(s) desregistrado(s)`);

    // Limpar todos os caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map(cacheName => {
        console.log('Removendo cache:', cacheName);
        return caches.delete(cacheName);
      });
      
      await Promise.all(deletePromises);
      console.log(`${cacheNames.length} cache(s) removido(s)`);
    }

    // Limpar localStorage relacionado ao SW
    const swKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sw_prompted_')
    );
    
    swKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removido do localStorage:', key);
    });

    console.log('✅ Limpeza completa realizada com sucesso!');
    console.log('💡 Recarregue a página para aplicar as mudanças.');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

/**
 * Verifica o status atual dos Service Workers
 */
export async function checkServiceWorkerStatus(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado neste navegador');
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    console.log('📊 Status dos Service Workers:');
    console.log(`Total de registros: ${registrations.length}`);
    
    registrations.forEach((registration, index) => {
      console.log(`\n--- SW ${index + 1} ---`);
      console.log('Scope:', registration.scope);
      console.log('Active:', registration.active?.scriptURL || 'Nenhum');
      console.log('Waiting:', registration.waiting?.scriptURL || 'Nenhum');
      console.log('Installing:', registration.installing?.scriptURL || 'Nenhum');
    });

    // Verificar caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('\n📦 Caches disponíveis:');
      cacheNames.forEach(name => console.log(`- ${name}`));
    }

    // Verificar localStorage do SW
    const swKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sw_prompted_')
    );
    
    if (swKeys.length > 0) {
      console.log('\n🔑 Chaves SW no localStorage:');
      swKeys.forEach(key => {
        console.log(`- ${key}: ${localStorage.getItem(key)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
  }
}

/**
 * Força a atualização do Service Worker (para testes)
 */
export async function forceServiceWorkerUpdate(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado neste navegador');
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      console.log('Nenhum Service Worker registrado para atualizar');
      return;
    }

    console.log('🔄 Forçando atualização dos Service Workers...');
    
    const updatePromises = registrations.map(registration => {
      console.log('Atualizando:', registration.scope);
      return registration.update();
    });
    
    await Promise.all(updatePromises);
    console.log('✅ Atualização forçada concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao forçar atualização:', error);
  }
}

// Disponibilizar funções globalmente para uso no DevTools
if (typeof window !== 'undefined') {
  (window as any).swDevUtils = {
    clear: clearAllServiceWorkers,
    status: checkServiceWorkerStatus,
    update: forceServiceWorkerUpdate
  };
  
  console.log('🛠️ SW Dev Utils carregados!');
  console.log('Use no console: swDevUtils.clear(), swDevUtils.status(), swDevUtils.update()');
}