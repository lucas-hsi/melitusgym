// Firebase Messaging Service Worker
// Este arquivo deve estar na pasta public para ser acessível pelo navegador

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração do Firebase (será preenchida via variáveis de ambiente)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Obter instância do messaging
const messaging = firebase.messaging();

// Manipular mensagens em background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Melitus Gym';
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem uma nova notificação',
    icon: '/icon-192x192.svg',
    badge: '/icon-192x192.svg',
    tag: 'melitus-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'dismiss',
        title: 'Dispensar'
      }
    ],
    data: {
      url: payload.data?.route || '/dashboard',
      alarmId: payload.data?.alarmId
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Lidar com cliques em notificações
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Extrair dados da notificação
  const data = event.notification.data || {};
  const route = data.route || '/dashboard';
  const alarmId = data.alarmId;
  
  // Construir URL com parâmetros
  let targetUrl = self.location.origin + route;
  if (alarmId) {
    const separator = route.includes('?') ? '&' : '?';
    targetUrl += `${separator}alarmId=${alarmId}&action=notification-click`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Se já existe uma janela aberta, focar nela e enviar mensagem
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin)) {
            return client.focus().then(() => {
              // Enviar mensagem para o cliente com dados do deep link
              client.postMessage({
                type: 'notification-click',
                data: {
                  route: route,
                  alarmId: alarmId,
                  action: 'notification-click'
                }
              });
            });
          }
        }
        
        // Se não há janela aberta, abrir uma nova com a URL
        return clients.openWindow(targetUrl);
      })
  );
});

// Manipular instalação do service worker
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing.');
  self.skipWaiting();
});

// Manipular ativação do service worker
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating.');
  event.waitUntil(clients.claim());
});