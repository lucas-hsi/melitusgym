'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface DeepLinkData {
  route?: string;
  alarmId?: string;
  action?: string;
  [key: string]: any;
}

export function useDeepLinks() {
  const router = useRouter();

  // Processar deep link
  const processDeepLink = useCallback((data: DeepLinkData) => {
    console.log('Processing deep link:', data);
    
    // Se tem uma rota específica, navegar para ela
    if (data.route) {
      let targetRoute = data.route;
      
      // Adicionar parâmetros se necessário
      const params = new URLSearchParams();
      
      if (data.alarmId) {
        params.set('alarmId', data.alarmId);
      }
      
      if (data.action) {
        params.set('action', data.action);
      }
      
      // Adicionar outros parâmetros
      Object.keys(data).forEach(key => {
        if (!['route', 'alarmId', 'action'].includes(key) && data[key]) {
          params.set(key, String(data[key]));
        }
      });
      
      if (params.toString()) {
        targetRoute += `?${params.toString()}`;
      }
      
      router.push(targetRoute);
    } else {
      // Fallback para dashboard
      router.push('/dashboard');
    }
  }, [router]);

  // Lidar com notificação clicada (FCM)
  const handleNotificationClick = useCallback((event: MessageEvent) => {
    if (event.data && event.data.type === 'notification-click') {
      processDeepLink(event.data.data || {});
    }
  }, [processDeepLink]);

  // Lidar com URL inicial (quando app é aberto via deep link)
  const handleInitialUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const data: DeepLinkData = {};
    
    // Extrair parâmetros da URL
    urlParams.forEach((value, key) => {
      data[key] = value;
    });
    
    // Se há parâmetros relevantes, processar
    if (Object.keys(data).length > 0) {
      processDeepLink(data);
    }
  }, [processDeepLink]);

  // Configurar listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listener para mensagens do service worker
    window.addEventListener('message', handleNotificationClick);
    
    // Processar URL inicial
    handleInitialUrl();
    
    // Listener para mudanças de visibilidade (quando app volta ao foco)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleInitialUrl();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('message', handleNotificationClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleNotificationClick, handleInitialUrl]);

  return {
    processDeepLink
  };
}