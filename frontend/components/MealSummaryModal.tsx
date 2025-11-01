'use client';

import React from 'react';
import { X, Check } from 'lucide-react';

interface MealItem {
  id: string;
  name: string;
  carbs: number;
}

interface MealSummaryModalProps {
  isOpen: boolean;
  items: MealItem[];
  carbsTotal: number;
  insulinSuggested: number;
  summaryMessage?: string;
  onClose: () => void;
  onConfirm: () => void;
}

const MealSummaryModal: React.FC<MealSummaryModalProps> = ({
  isOpen,
  items,
  carbsTotal,
  insulinSuggested,
  summaryMessage,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
        {/* header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-800">Revisar Refeição</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* content */}
        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3">
          {summaryMessage && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              {summaryMessage}
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-1 text-sm">
              <span>{item.name}</span>
              <span>{item.carbs.toFixed(1)}g carbs</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 font-semibold">
            <span>Total Carbs:</span>
            <span>{carbsTotal.toFixed(1)}g</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Insulina Sugerida:</span>
            <span>{insulinSuggested}u</span>
          </div>
        </div>
        {/* footer */}
        <div className="flex space-x-3 border-t bg-gray-50 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            Voltar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Confirmar
            <Check className="ml-2 inline h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealSummaryModal;