'use client';

import React, { useState, useEffect } from 'react';
import { X, Scale, Plus, Minus } from 'lucide-react';

interface PortionPreset {
  id: string;
  name: string;
  grams: number;
  description?: string;
}

interface PortionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (grams: number, portionName: string) => void;
  foodName: string;
  defaultGrams?: number;
}

const PortionModal: React.FC<PortionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  foodName,
  defaultGrams = 100
}) => {
  const [selectedGrams, setSelectedGrams] = useState(defaultGrams);
  const [customGrams, setCustomGrams] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Common portion presets
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedGrams(defaultGrams);
      setCustomGrams('');
      setSelectedPreset('medium'); // Default to medium portion
      setIsCustomMode(false);
    }
  }, [isOpen, defaultGrams]);

  // Handle preset selection
  const handlePresetSelect = (preset: PortionPreset) => {
    setSelectedPreset(preset.id);
    setSelectedGrams(preset.grams);
    setIsCustomMode(false);
    setCustomGrams('');
  };

  // Handle custom input
  const handleCustomInput = (value: string) => {
    setCustomGrams(value);
    const grams = parseFloat(value);
    if (!isNaN(grams) && grams > 0) {
      setSelectedGrams(grams);
      setSelectedPreset(null);
      setIsCustomMode(true);
    }
  };

  // Adjust grams with +/- buttons
  const adjustGrams = (delta: number) => {
    const newGrams = Math.max(1, selectedGrams + delta);
    setSelectedGrams(newGrams);
    if (isCustomMode) {
      setCustomGrams(newGrams.toString());
    }
    setSelectedPreset(null);
  };

  // Handle confirm
  const handleConfirm = () => {
    const grams = isCustomMode && customGrams ? parseFloat(customGrams) : selectedGrams;
    if (grams > 0) {
      const portionName = selectedPreset 
        ? portionPresets.find(p => p.id === selectedPreset)?.name || 'Personalizada'
        : 'Personalizada';
      onConfirm(grams, portionName);
    }
  };

  // Get current portion name
  const getCurrentPortionName = () => {
    if (selectedPreset) {
      return portionPresets.find(p => p.id === selectedPreset)?.name || 'Personalizada';
    }
    return 'Personalizada';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Selecionar Porção</h3>
            <p className="text-sm text-gray-600">{foodName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
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

          {/* Common Conversions */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h5 className="font-medium text-gray-700 mb-2 text-sm">Conversões Úteis</h5>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• 1 xícara ≈ 240g (líquidos) / 120-150g (sólidos)</div>
              <div>• 1 colher de sopa ≈ 15g</div>
              <div>• 1 colher de chá ≈ 5g</div>
              <div>• 1 fatia de pão ≈ 30g</div>
              <div>• 1 fruta média ≈ 80-120g</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedGrams <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar {selectedGrams}g
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortionModal;