"""
Sistema de cache simples e eficiente para otimização de performance
Implementa cache em memória com TTL e invalidação inteligente
"""
import functools
import time
import weakref
from typing import Any, Callable, Dict, Optional, TypeVar, Union
from datetime import datetime, timedelta
import threading
import hashlib
import json

T = TypeVar('T')

class CacheEntry:
    """Entrada individual do cache com TTL"""
    
    def __init__(self, value: Any, ttl_seconds: int = 300):
        self.value = value
        self.created_at = time.time()
        self.ttl_seconds = ttl_seconds
        self.access_count = 0
        self.last_accessed = self.created_at
    
    def is_expired(self) -> bool:
        """Verifica se a entrada expirou"""
        return time.time() - self.created_at > self.ttl_seconds
    
    def access(self) -> Any:
        """Acessa o valor e atualiza estatísticas"""
        self.access_count += 1
        self.last_accessed = time.time()
        return self.value

class MemoryCache:
    """Cache em memória thread-safe com TTL e limpeza automática"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'cleanups': 0
        }
    
    def _generate_key(self, *args, **kwargs) -> str:
        """Gera chave única para os argumentos"""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Obtém valor do cache"""
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self._stats['misses'] += 1
                return None
            
            if entry.is_expired():
                del self._cache[key]
                self._stats['misses'] += 1
                return None
            
            self._stats['hits'] += 1
            return entry.access()
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Define valor no cache"""
        with self._lock:
            # Limpar cache se necessário
            if len(self._cache) >= self.max_size:
                self._evict_expired()
                
                # Se ainda estiver cheio, remover entradas menos acessadas
                if len(self._cache) >= self.max_size:
                    self._evict_lru()
            
            ttl = ttl or self.default_ttl
            self._cache[key] = CacheEntry(value, ttl)
    
    def delete(self, key: str) -> bool:
        """Remove entrada do cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Limpa todo o cache"""
        with self._lock:
            self._cache.clear()
            self._stats['cleanups'] += 1
    
    def _evict_expired(self) -> None:
        """Remove entradas expiradas"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time - entry.created_at > entry.ttl_seconds
        ]
        
        for key in expired_keys:
            del self._cache[key]
            self._stats['evictions'] += 1
    
    def _evict_lru(self) -> None:
        """Remove entradas menos recentemente usadas"""
        if not self._cache:
            return
        
        # Remover 20% das entradas menos acessadas
        entries_to_remove = max(1, len(self._cache) // 5)
        
        # Ordenar por último acesso
        sorted_entries = sorted(
            self._cache.items(),
            key=lambda x: x[1].last_accessed
        )
        
        for key, _ in sorted_entries[:entries_to_remove]:
            del self._cache[key]
            self._stats['evictions'] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas do cache"""
        with self._lock:
            total_requests = self._stats['hits'] + self._stats['misses']
            hit_rate = self._stats['hits'] / total_requests if total_requests > 0 else 0
            
            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self._stats['hits'],
                'misses': self._stats['misses'],
                'hit_rate': hit_rate,
                'evictions': self._stats['evictions'],
                'cleanups': self._stats['cleanups']
            }

# Instância global do cache
_global_cache = MemoryCache(max_size=1000, default_ttl=300)

def cached(ttl: int = 300, cache_instance: Optional[MemoryCache] = None):
    """Decorator para cache de funções"""
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        cache = cache_instance or _global_cache
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            # Gerar chave do cache
            cache_key = f"{func.__module__}.{func.__name__}:{cache._generate_key(*args, **kwargs)}"
            
            # Tentar obter do cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Executar função e cachear resultado
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        
        # Adicionar métodos de controle do cache
        wrapper.cache_clear = lambda: cache.clear()
        wrapper.cache_info = lambda: cache.get_stats()
        wrapper.cache_delete = lambda *args, **kwargs: cache.delete(
            f"{func.__module__}.{func.__name__}:{cache._generate_key(*args, **kwargs)}"
        )
        
        return wrapper
    
    return decorator

def cache_user_by_id(ttl: int = 600):
    """Cache específico para usuários por ID"""
    return cached(ttl=ttl)

def cache_user_by_email(ttl: int = 600):
    """Cache específico para usuários por email"""
    return cached(ttl=ttl)

def invalidate_user_cache(user_id: int = None, email: str = None) -> None:
    """Invalida cache de usuário específico"""
    # Esta função seria expandida para invalidar caches específicos
    # Por enquanto, limpa todo o cache (pode ser otimizado)
    _global_cache.clear()

def get_cache_stats() -> Dict[str, Any]:
    """Obtém estatísticas globais do cache"""
    return _global_cache.get_stats()

# Cache específico para sessões de usuário
user_session_cache = MemoryCache(max_size=100, default_ttl=1800)  # 30 minutos