'use client';

import React from 'react';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { useNotifications } from '@/lib/notifications';
import ServiceWorkerRegistration from './ServiceWorkerRegistration';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  // Inicializar deep links
  useDeepLinks();
  
  // Inicializar notificações automaticamente
  const { initialize } = useNotifications();
  
  React.useEffect(() => {
    // Aguardar um pouco antes de inicializar para não interferir no carregamento
    const timer = setTimeout(() => {
      initialize();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [initialize]);
  
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
      <PWAInstallPrompt />
    </>
  );
}