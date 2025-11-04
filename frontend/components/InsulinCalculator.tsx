'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Droplet, AlertCircle, Info, HelpCircle } from 'lucide-react';
import tacoService from '@/lib/tacoService';
import { useHealth } from '@/contexts/HealthContext';

// Local type definition (removed from tacoService after refactor)
interface InsulinCalculation {
  insulinDose: number;
  correctionDose: number;
  totalDose: number;
}

interface InsulinCalculatorProps {
  totalCarbs: number;
  onClose?: () => void;
  onSave?: (payload: {
    totalCarbs: number;
    glucose?: number;
    measured?: boolean;
    timing?: 'before' | 'after';
    suggestedDose: number;
    usedDose: number;
  }) => void;
  carbFactor?: number; // g por unidade (padrão 10)
}

const InsulinCalculator: React.FC<InsulinCalculatorProps> = ({
  totalCarbs,
  onClose,
  onSave,
  carbFactor = 10
}) => {
  const { state } = useHealth();
  
  // Estado para sensibilidade à insulina (g de carboidratos por 1U de insulina)
  const defaultSensitivity = state.profile?.insulinSensitivity || carbFactor;
  const [sensitivity, setSensitivity] = useState<number>(defaultSensitivity);
  
  // Estado para ajuste de alto índice glicêmico (%)
  const [highGlycemicAdjustment, setHighGlycemicAdjustment] = useState<number>(0);
  
  // Estado para resultado do cálculo
  const [calculation, setCalculation] = useState<InsulinCalculation | null>(null);
  
  // Estado para mostrar informações adicionais
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Estado para glicemia e contexto da aferição
  const [glucose, setGlucose] = useState<number | ''>('');
  const [measured, setMeasured] = useState<boolean>(true);
  const [timing, setTiming] = useState<'before' | 'after'>('before');

  // Estado para edição manual da dose
  const [manualDose, setManualDose] = useState<number | ''>('');

  // Recalcular quando os valores mudarem
  useEffect(() => {
    calculateInsulin();
  }, [totalCarbs, sensitivity, highGlycemicAdjustment, measured, glucose]);

  const calculateInsulin = () => {
    // Dose de insulina base: total de carboidratos / sensibilidade
    const baseDose = totalCarbs / sensitivity;

    // Ajuste para alto índice glicêmico
    const adjustmentFactor = 1 + (highGlycemicAdjustment / 100);
    const adjustedDose = baseDose * adjustmentFactor;

    const targetGlucose = state.profile?.glucoseTarget || 100;
    let correctionDose = 0;
    if (measured && typeof glucose === 'number' && glucose > targetGlucose) {
      // 1U para cada 50mg/dL acima do alvo
      correctionDose = (glucose - targetGlucose) / 50;
    }

    setCalculation({
      insulinDose: Math.round(adjustedDose * 10) / 10,
      correctionDose: Math.round(correctionDose * 10) / 10,
      totalDose: Math.round((adjustedDose + correctionDose) * 10) / 10
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Calculadora de Insulina
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Total de carboidratos */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-600 mb-1">Total de Carboidratos</div>
            <div className="text-2xl font-bold text-blue-700">{totalCarbs}g</div>
          </div>

          {/* Valor de glicemia atual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valor de Glicemia (mg/dL)</label>
            <input
              type="number"
              value={glucose === '' ? '' : glucose}
              onChange={(e) => {
                const v = e.target.value;
                setGlucose(v === '' ? '' : Number(v));
              }}
              placeholder="Ex: 120"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="1"
            />
          </div>

          {/* Mediu a glicemia? e Momento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Glicemia aferida?</label>
              <select
                value={measured ? 'yes' : 'no'}
                onChange={(e) => setMeasured(e.target.value === 'yes')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Momento da aferição</label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value as 'before' | 'after')}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="before">Antes da refeição</option>
                <option value="after">Depois da refeição</option>
              </select>
            </div>
          </div>

          {/* Sensibilidade à insulina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sensibilidade à Insulina (g/U)
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="ml-2 text-blue-500 hover:text-blue-700"
              >
                <HelpCircle className="w-4 h-4 inline" />
              </button>
            </label>
            <input
              type="number"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              step="1"
            />
            {showInfo && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <Info className="w-4 h-4 inline mr-1" />
                Quantos gramas de carboidrato 1 unidade de insulina cobre. Exemplo: 15g/U significa que 1U de insulina processa 15g de carboidratos.
              </div>
            )}
          </div>

          {/* Ajuste de alto índice glicêmico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ajuste para Alto Índice Glicêmico (%)
            </label>
            <input
              type="number"
              value={highGlycemicAdjustment}
              onChange={(e) => setHighGlycemicAdjustment(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              max="100"
              step="5"
            />
            <p className="mt-1 text-xs text-gray-500">
              Adicione 10-20% para alimentos de alto índice glicêmico (doces, pão branco, etc.)
            </p>
          </div>

          {/* Resultados */}
          {calculation && (
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm opacity-90">Dose Base</span>
                <span className="font-semibold">{calculation.insulinDose}U</span>
              </div>
              {calculation.correctionDose > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm opacity-90">Correção</span>
                  <span className="font-semibold">+{calculation.correctionDose}U</span>
                </div>
              )}
              <div className="border-t border-blue-400 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2">
                    <Droplet className="w-5 h-5" />
                    Dose Total (estimada)
                  </span>
                  <span className="text-2xl font-bold">{calculation.totalDose}U</span>
                </div>
              </div>
            </div>
          )}

          {/* Dose recomendada (editável) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dose de Insulina Recomendada (editável)</label>
            <input
              type="number"
              value={manualDose === '' ? '' : manualDose}
              onChange={(e) => {
                const v = e.target.value;
                setManualDose(v === '' ? '' : Number(v));
              }}
              placeholder={calculation ? `${calculation.totalDose}U` : 'Ex: 6'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="1"
            />
            <p className="mt-1 text-xs text-gray-500">Você pode ajustar manualmente conforme orientação médica.</p>
          </div>

          {/* Aviso importante */}
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Aviso:</strong> Este é apenas um cálculo estimado. Sempre consulte seu médico ou profissional de saúde antes de ajustar suas doses de insulina.
              </div>
            </div>
          </div>

          {/* Ações */}
          {onSave && (
            <button
              onClick={() => {
                const total = calculation?.totalDose || 0;
                // Regra de arredondamento: sem meia unidade; <=1.5 vai para 1; senão usa arredondamento comum
                const suggested = total > 0 ? (total <= 1.5 ? 1 : Math.round(total)) : 0;
                const used = typeof manualDose === 'number' ? manualDose : suggested;
                onSave({
                  totalCarbs,
                  glucose: typeof glucose === 'number' ? glucose : undefined,
                  measured,
                  timing,
                  suggestedDose: suggested,
                  usedDose: used,
                });
              }}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsulinCalculator;
