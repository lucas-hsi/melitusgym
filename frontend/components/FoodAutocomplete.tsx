'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import tacoService, { TacoFood } from '@/lib/tacoService';

interface FoodAutocompleteProps {
  onSelect: (food: TacoFood) => void;
  placeholder?: string;
  className?: string;
}

const FoodAutocomplete: React.FC<FoodAutocompleteProps> = ({
  onSelect,
  placeholder = 'Buscar alimento...',
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TacoFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [searchSource, setSearchSource] = useState<'local' | 'online' | 'both'>('both');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Busca alimentos quando o query muda
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setErrorMessage('');
      return;
    }

    // Debounce para evitar muitas requisições
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      await performSearch(query.trim());
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchSource]);

  // Função para realizar busca híbrida
  const performSearch = async (searchTerm: string) => {
    setIsLoading(true);
    setErrorMessage('');
    let foundItems: TacoFood[] = [];

    try {
      // Busca local primeiro (base de dados)
      if (searchSource === 'local' || searchSource === 'both') {
        try {
          const localResponse = await tacoService.searchTacoFoods(searchTerm);
          foundItems = localResponse.items;
          
          if (foundItems.length > 0) {
            setResults(foundItems);
            setIsOpen(true);
            setHighlightedIndex(-1);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Busca local falhou, tentando TBCA online...', error);
        }
      }

      // Se não encontrou localmente e busca online está habilitada, tenta TBCA online
      if ((searchSource === 'online' || searchSource === 'both') && foundItems.length === 0) {
        try {
          const onlineResponse = await tacoService.searchTacoOnline(searchTerm, 20);
          
          if (onlineResponse.items && onlineResponse.items.length > 0) {
            // Converte resultados online para formato TacoFood
            const convertedItems = onlineResponse.items.map(item => 
              tacoService.convertTacoOnlineToTacoFood(item)
            );
            foundItems = convertedItems;
            setResults(convertedItems);
            setIsOpen(true);
            setHighlightedIndex(-1);
          } else if (onlineResponse.error) {
            setErrorMessage(onlineResponse.message || 'Serviço temporariamente indisponível');
          }
        } catch (error: any) {
          console.error('Busca online falhou:', error);
          setErrorMessage(error.message || 'Erro ao buscar alimentos (TBCA online)');
        }
      }

      // Se não encontrou em nenhuma fonte
      if (foundItems.length === 0) {
        setResults([]);
        setIsOpen(true);
        setErrorMessage('Nenhum alimento encontrado. source: not_found');
      }

    } catch (error) {
      console.error('Erro na busca de alimentos:', error);
      setResults([]);
      setErrorMessage('Erro ao buscar alimentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fecha o dropdown quando clica fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manipula navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prevIndex) =>
          prevIndex < results.length - 1 ? prevIndex + 1 : prevIndex
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Manipula seleção de item
  const handleSelect = (food: TacoFood) => {
    onSelect(food);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Limpa o input
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm"
          aria-label="Buscar alimento"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpar busca"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto border border-gray-200"
        >
          <ul className="py-1">
            {results.map((food, index) => (
              <li
                key={`${food.source}-${food.id}`}
                onClick={() => handleSelect(food)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                  highlightedIndex === index ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium text-gray-800">{food.name}</div>
                  {food.source?.startsWith('taco') && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                      Local
                    </span>
                  )}
                  {food.source === 'tbca_online' && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0">
                      Online
                    </span>
                  )}
                </div>
                {food.category && (
                  <div className="text-xs text-gray-500">{food.category}</div>
                )}
                <div className="flex space-x-4 mt-1 text-xs text-gray-600">
                  <span>
                    {food.nutrients_per_100g.carbohydrates?.toFixed(1) || '?'} g carbs
                  </span>
                  <span>
                    {food.nutrients_per_100g.energy_kcal?.toFixed(0) || '?'} kcal
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center">
          {errorMessage ? (
            <div className="text-red-500 text-sm">
              <p className="font-medium">⚠️ {errorMessage}</p>
              <p className="text-xs text-gray-500 mt-1">Tente outro termo de busca</p>
            </div>
          ) : (
            <div className="text-gray-500">
              <p>Nenhum alimento encontrado</p>
              <p className="text-xs text-gray-400 mt-1">source: not_found</p>
              <p className="text-xs text-gray-400 mt-1">
                Buscando em: base oficial local {searchSource === 'both' ? '+ TBCA online' : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">Tente outro termo ou variações.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FoodAutocomplete;