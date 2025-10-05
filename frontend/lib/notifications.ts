import React from 'react';
import { api } from './api';

// Configuração do Firebase (será preenchida via variáveis de ambiente)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Variáveis para Firebase (inicializadas apenas no cliente)
let app: any = null;
let messaging: any = null;

// Função para inicializar Firebase apenas no cliente
async function initializeFirebase() {
  if (typeof window === 'undefined' || app) return;
  
  const { initializeApp } = await import('firebase/app');
  const { getMessaging } = await import('firebase/messaging');
  
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
}

// Detectar plataforma
function getPlatform(): 'WEB_IOS' | 'WEB_ANDROID' | 'WEB_DESKTOP' {
  if (typeof window === 'undefined') return 'WEB_DESKTOP';
  
  const userAgent = window.navigator.userAgent;
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'WEB_IOS';
  } else if (/Android/.test(userAgent)) {
    return 'WEB_ANDROID';
  } else {
    return 'WEB_DESKTOP';
  }
}

// Verificar se notificações são suportadas
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 
         'Notification' in window && 
         'serviceWorker' in navigator && 
         'PushManager' in window;
}

// Verificar permissão de notificação
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

// Solicitar permissão de notificação
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notificações não são suportadas neste navegador');
    return false;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação:', error);
    return false;
  }
}

// Registrar service worker
export async function registerServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não é suportado');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registrado:', registration);
    return true;
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    return false;
  }
}

// Obter token FCM
export async function getFCMToken(): Promise<string | null> {
  await initializeFirebase();
  
  if (!messaging) {
    console.warn('Firebase Messaging não está disponível');
    return null;
  }
  
  try {
    const { getToken } = await import('firebase/messaging');
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('VAPID key não configurada');
      return null;
    }
    
    const token = await getToken(messaging, { vapidKey });
    console.log('FCM Token obtido:', token);
    return token;
  } catch (error) {
    console.error('Erro ao obter FCM token:', error);
    return null;
  }
}

// Registrar token no backend
export async function registerTokenInBackend(token: string): Promise<boolean> {
  try {
    const platform = getPlatform();
    
    await api.post('/notifications/token', {
      token,
      platform
    });
    
    console.log('Token registrado no backend com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao registrar token no backend:', error);
    return false;
  }
}

// Remover token do backend
export async function removeTokenFromBackend(): Promise<boolean> {
  try {
    await api.delete('/notifications/token');
    console.log('Token removido do backend com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao remover token do backend:', error);
    return false;
  }
}

// Configurar listener para mensagens em foreground
export async function setupForegroundMessageListener(callback: (payload: any) => void) {
  await initializeFirebase();
  
  if (!messaging) {
    console.warn('Firebase Messaging não está disponível');
    return () => {};
  }
  
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, callback);
}

// Inicializar notificações completas
export async function initializeNotifications(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    // 1. Verificar suporte
    if (!isNotificationSupported()) {
      return {
        success: false,
        error: 'Notificações não são suportadas neste navegador'
      };
    }
    
    // 2. Registrar service worker
    const swRegistered = await registerServiceWorker();
    if (!swRegistered) {
      return {
        success: false,
        error: 'Falha ao registrar Service Worker'
      };
    }
    
    // 3. Solicitar permissão
    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      return {
        success: false,
        error: 'Permissão de notificação negada'
      };
    }
    
    // 4. Obter token FCM
    const token = await getFCMToken();
    if (!token) {
      return {
        success: false,
        error: 'Falha ao obter token FCM'
      };
    }
    
    // 5. Registrar token no backend
    const backendRegistered = await registerTokenInBackend(token);
    if (!backendRegistered) {
      return {
        success: false,
        error: 'Falha ao registrar token no backend'
      };
    }
    
    // 6. Inicializar Firebase
    await initializeFirebase();
    
    // 7. Configurar listener para mensagens em foreground
    await setupForegroundMessageListener((payload) => {
      console.log('Mensagem recebida em foreground:', payload);
      
      // Mostrar notificação personalizada se necessário
      if (payload.notification) {
        const notification = new Notification(
          payload.notification.title || 'Melitus Gym',
          {
            body: payload.notification.body,
            icon: '/icon-192x192.svg',
            badge: '/icon-192x192.svg',
            tag: 'melitus-foreground'
          }
        );
        
        notification.onclick = () => {
          window.focus();
          if (payload.data?.route) {
            window.location.href = payload.data.route;
          }
          notification.close();
        };
      }
    });
    
    return {
      success: true,
      token
    };
    
  } catch (error) {
    console.error('Erro ao inicializar notificações:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Hook para usar notificações em componentes React
export function useNotifications() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const initialize = async () => {
    const result = await initializeNotifications();
    
    setIsInitialized(true);
    
    if (result.success) {
      setToken(result.token || null);
      setError(null);
    } else {
      setError(result.error || 'Erro desconhecido');
      setToken(null);
    }
  };
  
  const disable = async () => {
    if (token) {
      await removeTokenFromBackend();
      setToken(null);
    }
  };
  
  return {
    isInitialized,
    token,
    error,
    isSupported: isNotificationSupported(),
    permission: getNotificationPermission(),
    initialize,
    disable
  };
}