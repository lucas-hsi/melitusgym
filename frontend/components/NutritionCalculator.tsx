'use client';

import React, { useState, useEffect } from 'react';
import { Scale, Plus, Minus, Info } from 'lucide-react';
import tacoService, { TacoFood, TacoNutrient } from '@/lib/tacoService';

interface NutritionCalculatorProps {
  food: TacoFood;
  onAddToDish: (food: TacoFood, grams: number, calculatedNutrients: TacoNutrient) => void;
  onCancel: () => void;
}

interface PortionPreset {
  id: string;
  name: string;
  grams: number;
  description?: string;
}

const NutritionCalculator: React.FC<NutritionCalculatorProps> = ({
  food,
  onAddToDish,
  onCancel
}) => {
  const [selectedGrams, setSelectedGrams] = useState(100);
  const [customGrams, setCustomGrams] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>('medium');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [calculatedNutrients, setCalculatedNutrients] = useState<TacoNutrient>({});
  const [isCalculating, setIsCalculating] = useState(false);

  // Presets de porção comuns
  const portionPresets: PortionPreset[] = [
    { id: 'small', name: 'Pequena', grams: 50, description: '50g' },
    { id: 'medium', name: 'Média', grams: 100, description: '100g' },
    { id: 'large', name: 'Grande', grams: 150, description: '150g' },
    { id: 'extra-large', name: 'Extra Grande', grams: 200, description: '200g' },
    { id: 'cup', name: '1 Xícara', grams: 240, description: '~240g' },
    { id: 'tablespoon', name: '1 Colher Sopa', grams: 15, description: '~15g' },
    { id: 'teaspoon', name: '1 Colher Chá', grams: 5, description: '~5g' },
    { id: 'slice', name: '1 Fatia', grams: 30, description: '~30g' },
    { id: 'unit', name: '1 Unidade', grams: 80, description: '~80g' },
    { id: 'handful', name: '1 Punhado', grams: 25, description: '~25g' }
  ];

  // Calcula nutrientes quando a quantidade ou o alimento mudam
  useEffect(() => {
    calculateNutrition();
  }, [selectedGrams, food]);

  // Manipula seleção de preset
  const handlePresetSelect = (preset: PortionPreset) => {
    setSelectedPreset(preset.id);
    setSelectedGrams(preset.grams);
    setIsCustomMode(false);
    setCustomGrams('');
  };

  // Manipula entrada personalizada
  const handleCustomInput = (value: string) => {
    setCustomGrams(value);
    const grams = parseFloat(value);
    if (!isNaN(grams) && grams > 0) {
      setSelectedGrams(grams);
      setSelectedPreset(null);
      setIsCustomMode(true);
    }
  };

  // Ajusta gramas com botões +/-
  const adjustGrams = (delta: number) => {
    const newGrams = Math.max(1, selectedGrams + delta);
    setSelectedGrams(newGrams);
    if (isCustomMode) {
      setCustomGrams(newGrams.toString());
    }
    setSelectedPreset(null);
  };

  // Calcula nutrientes para a porção selecionada
  const calculateNutrition = async () => {
    if (!food || selectedGrams <= 0) return;

    try {
      // Cálculo local para melhor performance
      const nutrients = tacoService.calculateNutritionLocally(
        food.nutrients_per_100g,
        selectedGrams
      );
      setCalculatedNutrients(nutrients);
    } catch (error) {
      console.error('Erro ao calcular nutrição:', error);
    }
  };

  // Manipula confirmação
  const handleConfirm = () => {
    if (selectedGrams <= 0) return;
    onAddToDish(food, selectedGrams, calculatedNutrients);
  };

  // Obtém nome da porção atual
  const getCurrentPortionName = () => {
    if (selectedPreset) {
      return portionPresets.find(p => p.id === selectedPreset)?.name || 'Personalizada';
    }
    return 'Personalizada';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Selecionar Porção</h3>
            <p className="text-sm text-gray-600">{food.name}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="sr-only">Fechar</span>
            {/* Ícone de fechar para melhor UX */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Current Selection Display */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Scale className="w-6 h-6 text-blue-600 mr-2" />
              <span className="text-2xl font-bold text-blue-600">{selectedGrams}g</span>
            </div>
            <p className="text-sm text-gray-600">
              Porção: {getCurrentPortionName()}
            </p>
          </div>

          {/* Nutrition Info */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Informação Nutricional</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Calorias</div>
                <div className="font-bold text-gray-800">
                  {calculatedNutrients.energy_kcal?.toFixed(0) || '0'} kcal
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Carboidratos</div>
                <div className="font-bold text-green-600">
                  {calculatedNutrients.carbohydrates?.toFixed(1) || '0'} g
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Proteínas</div>
                <div className="font-bold text-blue-600">
                  {calculatedNutrients.proteins?.toFixed(1) || '0'} g
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Gorduras</div>
                <div className="font-bold text-orange-600">
                  {calculatedNutrients.fat?.toFixed(1) || '0'} g
                </div>
              </div>
              {calculatedNutrients.fiber !== undefined && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Fibras</div>
                  <div className="font-bold text-gray-800">
                    {calculatedNutrients.fiber?.toFixed(1) || '0'} g
                  </div>
                </div>
              )}
              {calculatedNutrients.sodium !== undefined && (
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-sm text-gray-500">Sódio</div>
                  <div className="font-bold text-gray-800">
                    {calculatedNutrients.sodium?.toFixed(0) || '0'} mg
                  </div>
                </div>
              )}
            </div>
            {food.glycemic_index && (
              <div className="mt-3 flex items-center text-sm">
                <Info className="w-4 h-4 text-blue-500 mr-1" />
                <span>Índice Glicêmico: {food.glycemic_index.toFixed(0)}</span>
              </div>
            )}
          </div>

          {/* Quick Adjust */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => adjustGrams(-10)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">±10g</span>
            <button
              onClick={() => adjustGrams(10)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Portion Presets */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Porções Comuns</h4>
            <div className="grid grid-cols-2 gap-2">
              {portionPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedPreset === preset.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Input */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Quantidade Personalizada</h4>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={customGrams}
                onChange={(e) => handleCustomInput(e.target.value)}
                placeholder="Ex: 75"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                step="1"
              />
              <span className="text-gray-600 font-medium">gramas</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Digite a quantidade em gramas
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t bg-gray-50 sticky bottom-0 z-[1001]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedGrams <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Adicionar {selectedGrams}g
          </button>
        </div>
      </div>
    </div>
  );
};

export default NutritionCalculator;