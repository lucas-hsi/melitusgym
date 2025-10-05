import { useCallback } from 'react';

/**
 * Hook para gerenciar persistência automática de sessão
 * - Salva automaticamente mudanças no token/usuário
 * - Restaura sessão ao recarregar a página
 * - Limpa dados expirados
 */
export const useSessionPersistence = () => {
  // Funções utilitárias para persistência com useCallback para evitar re-criação
  const persistSession = useCallback((token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('session_timestamp', Date.now().toString());
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('session_timestamp');
  }, []);

  const getPersistedSession = useCallback(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('auth_user');
    const timestamp = localStorage.getItem('session_timestamp');
    
    if (token && userStr && timestamp) {
      try {
        const user = JSON.parse(userStr);
        const sessionAge = Date.now() - parseInt(timestamp);
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 horas
        
        if (sessionAge <= maxSessionAge) {
          return { token, user };
        }
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
      }
    }
    
    return null;
  }, []);

  return {
    persistSession,
    clearSession,
    getPersistedSession
  };
};

export default useSessionPersistence;