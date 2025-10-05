'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function UpdateModal({ isOpen, onClose, onUpdate }: UpdateModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = useCallback(() => {
    setIsUpdating(true);
    // Limpar flags de sessão antes da atualização
    sessionStorage.removeItem('sw_update_prompted');
    sessionStorage.removeItem('sw_update_dismissed');
    // Disparar evento para o Service Worker aplicar a atualização
    window.dispatchEvent(new Event('sw-skip-waiting'));
    onUpdate();
  }, [onUpdate]);

  const handleCancel = useCallback(() => {
    // Marcar que o usuário escolheu "Mais tarde" para esta sessão
    sessionStorage.setItem('sw_update_dismissed', '1');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 max-w-sm w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Nova versão disponível
          </h3>
          <button
            onClick={handleCancel}
            className="p-1 rounded-lg hover:bg-gray-100/50 transition-colors"
            disabled={isUpdating}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 text-sm leading-relaxed">
            Uma nova versão do Melitus Gym está disponível. Deseja atualizar agora para obter as últimas melhorias e correções?
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isUpdating}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100/50 hover:bg-gray-200/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mais tarde
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Atualizando...
              </>
            ) : (
              'Atualizar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook para gerenciar o estado do modal
export function useUpdateModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleUpdate = useCallback(() => {
    // O reload será feito automaticamente pelo controllerchange
    // Apenas fechamos o modal aqui
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    open,
    close,
    handleUpdate
  };
}