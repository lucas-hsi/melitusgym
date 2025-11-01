'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/lib/notifications';

export default function AlarmsPage() {
  const { isSupported, initialize, error } = useNotifications();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50/30 p-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Alarmes Push</h1>
          <p className="text-sm text-gray-500">Notificações push estão desativadas neste ambiente</p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Recurso desativado</span>
          </div>
          <p className="text-sm mt-2">
            O suporte a notificações push via Firebase foi removido. Seus lembretes clínicos permanecem disponíveis no módulo de Alarmes Clínicos.
          </p>
          {error && (
            <p className="text-xs mt-2">Detalhe: {error}</p>
          )}
        </div>

        <div className="mt-6">
          <Link href="/configuracoes" className="inline-block rounded-lg bg-indigo-600 text-white px-4 py-2 shadow hover:bg-indigo-700">
            Voltar para Configurações
          </Link>
        </div>
      </div>
    </div>
  );
}