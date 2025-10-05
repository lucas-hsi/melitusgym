'use client';

import { useEffect } from 'react';
import { setupServiceWorker } from '../lib/sw/register';
import { UpdateModal, useUpdateModal } from './UpdateModal';

interface ServiceWorkerProviderProps {
  children: React.ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const { isOpen, open, close, handleUpdate } = useUpdateModal();

  useEffect(() => {
    // Configurar Service Worker apenas no cliente
    if (typeof window !== 'undefined') {
      setupServiceWorker(() => {
        console.log('[SW Provider] Nova versão detectada, abrindo modal');
        open();
      });
      
      // Importar e configurar utilitários de desenvolvimento apenas no cliente
      if (process.env.NODE_ENV === 'development') {
        import('../lib/sw/dev-utils').then(() => {
          console.log('🛠️ Modo desenvolvimento: Service Workers serão desregistrados');
          console.log('💡 Use swDevUtils.status() para verificar o status dos SWs');
        }).catch(console.error);
      }
    }
  }, [open]);

  return (
    <>
      {children}
      <UpdateModal
        isOpen={isOpen}
        onClose={close}
        onUpdate={handleUpdate}
      />
    </>
  );
}