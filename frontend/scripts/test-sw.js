// Script de teste para Service Worker
// Execute no console do navegador para testar o fluxo de atualização

console.log('🧪 Iniciando testes do Service Worker...');

// Função para simular uma nova versão do SW
async function simulateNewVersion() {
  console.log('📝 Simulando nova versão do Service Worker...');
  
  // Primeiro, verificar se há SW registrado
  const registrations = await navigator.serviceWorker.getRegistrations();
  
  if (registrations.length === 0) {
    console.log('❌ Nenhum Service Worker registrado. Registre primeiro.');
    return;
  }
  
  const registration = registrations[0];
  console.log('✅ SW encontrado:', registration.scope);
  
  // Forçar atualização
  try {
    await registration.update();
    console.log('🔄 Atualização forçada executada');
    
    // Aguardar um pouco para ver se detecta mudanças
    setTimeout(() => {
      if (registration.waiting) {
        console.log('⏳ Nova versão em waiting detectada!');
        console.log('💡 O modal deveria aparecer agora...');
      } else {
        console.log('ℹ️ Nenhuma nova versão detectada (normal se não houve mudanças)');
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro ao forçar atualização:', error);
  }
}

// Função para testar o fluxo completo
async function testCompleteFlow() {
  console.log('🔍 Testando fluxo completo...');
  
  // 1. Verificar suporte
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker não suportado');
    return;
  }
  
  // 2. Verificar ambiente
  const isDev = window.location.hostname === 'localhost';
  console.log(`🌍 Ambiente: ${isDev ? 'Desenvolvimento' : 'Produção'}`);
  
  if (isDev) {
    console.log('⚠️ Em desenvolvimento, SWs são desregistrados automaticamente');
    console.log('💡 Para testar, faça build de produção: npm run build && npm start');
    return;
  }
  
  // 3. Verificar registros atuais
  const registrations = await navigator.serviceWorker.getRegistrations();
  console.log(`📊 Service Workers registrados: ${registrations.length}`);
  
  registrations.forEach((reg, index) => {
    console.log(`SW ${index + 1}:`);
    console.log(`  - Scope: ${reg.scope}`);
    console.log(`  - Active: ${reg.active ? '✅' : '❌'}`);
    console.log(`  - Waiting: ${reg.waiting ? '⏳' : '❌'}`);
    console.log(`  - Installing: ${reg.installing ? '🔄' : '❌'}`);
  });
  
  // 4. Verificar caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log(`💾 Caches: ${cacheNames.length}`);
    cacheNames.forEach(name => console.log(`  - ${name}`));
  }
  
  // 5. Verificar localStorage do SW
  const swKeys = Object.keys(localStorage).filter(key => key.startsWith('sw_prompted_'));
  console.log(`🔑 Chaves SW no localStorage: ${swKeys.length}`);
  swKeys.forEach(key => console.log(`  - ${key}: ${localStorage.getItem(key)}`));
}

// Função para limpar tudo e recomeçar
async function resetEverything() {
  console.log('🧹 Limpando tudo...');
  
  // Desregistrar SWs
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(reg => reg.unregister()));
  
  // Limpar caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
  
  // Limpar localStorage
  Object.keys(localStorage)
    .filter(key => key.startsWith('sw_prompted_'))
    .forEach(key => localStorage.removeItem(key));
  
  console.log('✅ Limpeza concluída! Recarregue a página.');
}

// Função para testar o modal manualmente
function testModal() {
  console.log('🎭 Testando modal manualmente...');
  
  // Simular evento de nova versão
  const event = new CustomEvent('sw-new-version');
  window.dispatchEvent(event);
  
  console.log('📢 Evento disparado. O modal deveria aparecer.');
}

// Disponibilizar funções globalmente
window.swTest = {
  simulate: simulateNewVersion,
  test: testCompleteFlow,
  reset: resetEverything,
  modal: testModal
};

console.log('✅ Funções de teste carregadas!');
console.log('📋 Comandos disponíveis:');
console.log('  - swTest.test() - Verificar status atual');
console.log('  - swTest.simulate() - Simular nova versão');
console.log('  - swTest.reset() - Limpar tudo');
console.log('  - swTest.modal() - Testar modal');
console.log('');
console.log('🚀 Execute swTest.test() para começar!');