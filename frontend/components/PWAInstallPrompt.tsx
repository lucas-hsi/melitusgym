'use client';

import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Home } from 'lucide-react';

interface PWAInstallPromptProps {
  onClose?: () => void;
}

export function PWAInstallPrompt({ onClose }: PWAInstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Detectar plataforma e modo de exibição
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Detectar se já está em modo standalone (PWA instalado)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Verificar se já foi mostrado recentemente
    const lastShown = localStorage.getItem('pwa-prompt-last-shown');
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 1 semana em ms

    // Não mostrar se:
    // - Já está em modo standalone
    // - Foi dispensado permanentemente
    // - Foi mostrado há menos de 1 semana
    if (standalone || dismissed === 'true' || (lastShown && (now - parseInt(lastShown)) < oneWeek)) {
      return;
    }

    // Para iOS Safari, mostrar prompt customizado
    if (iOS && !standalone) {
      // Aguardar um pouco antes de mostrar
      const timer = setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwa-prompt-last-shown', now.toString());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Listener para evento beforeinstallprompt (Android/Desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar prompt customizado após um delay
      setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('pwa-prompt-last-shown', Date.now().toString());
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Instalar PWA (Android/Desktop)
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA instalado');
    }
    
    setDeferredPrompt(null);
    handleClose();
  };

  // Fechar prompt
  const handleClose = () => {
    setShowPrompt(false);
    onClose?.();
  };

  // Dispensar permanentemente
  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    handleClose();
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center p-4 z-50">
      <div className="bg-white rounded-t-2xl max-w-md w-full animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Instalar Melitus Gym
          </h3>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Home className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600 mb-4">
              Instale o Melitus Gym na sua tela inicial para acesso rápido e notificações de lembretes.
            </p>
          </div>

          {/* Instruções específicas para iOS */}
          {isIOS ? (
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900">Como instalar no iOS:</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Toque no botão</span>
                    <Share className="w-4 h-4" />
                    <span>na barra inferior</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">2</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Selecione</span>
                    <Plus className="w-4 h-4" />
                    <span>"Adicionar à Tela de Início"</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">3</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Toque em "Adicionar" para confirmar
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Botão de instalação para Android/Desktop */
            <div className="mb-6">
              <button
                onClick={handleInstallClick}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
              >
                Instalar Aplicativo
              </button>
            </div>
          )}

          {/* Benefícios */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Benefícios:</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Acesso rápido da tela inicial
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Notificações de lembretes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Funciona offline
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Experiência nativa
              </li>
            </ul>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-gray-600 text-sm hover:text-gray-800 transition-colors"
            >
              Não mostrar novamente
            </button>
            <button
              onClick={handleClose}
              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para usar o prompt de instalação
export function usePWAInstall() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const showInstallPrompt = () => {
    setShowPrompt(true);
  };

  const hideInstallPrompt = () => {
    setShowPrompt(false);
  };

  return {
    showPrompt,
    canInstall,
    showInstallPrompt,
    hideInstallPrompt
  };
}