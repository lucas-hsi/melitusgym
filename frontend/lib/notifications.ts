// Notificações push desativadas: Firebase removido e FCM desligado
// Este módulo fornece stubs seguros para SSR e evita erros em build/dev
import React from 'react';

export function isNotificationSupported(): boolean {
  // Mantemos checagem segura para evitar acesso a window em SSR
  if (typeof window === 'undefined') return false;
  return false;
}

export function getNotificationPermission(): NotificationPermission {
  // Em SSR ou sem suporte, retornamos 'denied'
  if (typeof window === 'undefined') return 'denied';
  return 'denied';
}

export async function initializeNotifications(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  return {
    success: false,
    error: 'Notificações push desativadas (Firebase removido)'
  };
}

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
      setError(result.error || 'Notificações desativadas');
      setToken(null);
    }
  };

  const disable = async () => {
    setToken(null);
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