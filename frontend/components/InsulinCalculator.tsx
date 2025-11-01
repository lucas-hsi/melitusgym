'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Droplet, AlertCircle, Info, HelpCircle } from 'lucide-react';
import tacoService, { InsulinCalculation } from '@/lib/tacoService';
import { useHealth } from '@/contexts/HealthContext';

interface InsulinCalculatorProps {
  totalCarbs: number;
  onClose?: () => void;
}

const InsulinCalculator: React.FC<InsulinCalculatorProps> = ({
  totalCarbs,
  onClose
}) => {
  const { state } = useHealth();
  
  // Estado para sensibilidade à insulina (g de carboidratos por 1U de insulina)
  const defaultSensitivity = state.profile?.insulinSensitivity || 15;
  const [sensitivity, setSensitivity] = useState<number>(defaultSensitivity);
  
  // Estado para ajuste de alto índice glicêmico (%)
  const [highGlycemicAdjustment, setHighGlycemicAdjustment] = useState<number>(0);
  
  // Estado para resultado do cálculo
  const [calculation, setCalculation] = useState<InsulinCalculation | null>(null);
  
  // Estado para mostrar informações adicionais
  const [showInfo, setShowInfo] = useState<boolean>(false);

  // Recalcular quando os valores mudarem
  useEffect(() => {
    calculateInsulin();
  }, [totalCarbs, sensitivity, highGlycemicAdjustment]);

  // Função para calcular a dose de insulina
  const calculateInsulin = () => {
    if (totalCarbs <= 0 || sensitivity <= 0) {
      setCalculation(null);
      return;
    }

    try {
      const result = tacoService.calculateInsulin(
        totalCarbs,
        sensitivity,
        highGlycemicAdjustment
      );
      setCalculation(result);
    } catch (error) {
      console.error('Erro ao calcular insulina:', error);
      setCalculation(null);
    }
  };

  // Função para formatar número com 1 casa decimal
  const formatNumber = (value: number): string => {
    return value.toFixed(1);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-blue-500" />
          Calculadora de Insulina
        </h3>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <HelpCircle className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {showInfo && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-gray-700 border border-blue-200">
          <p className="mb-2 font-medium text-blue-700 text-base">Como funciona a calculadora de insulina:</p>
          
          <h5 className="font-medium text-blue-700 mt-3 mb-1">Parâmetros Customizáveis:</h5>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <b>Sensibilidade à insulina (g/U)</b>: Quantos gramas de carboidratos são metabolizados por 1 unidade de insulina Novorapid.
              <div className="mt-1 text-xs bg-blue-100 p-2 rounded">
                <b>Exemplo:</b> Se sua sensibilidade for 15g/U, então 15g de carboidratos requerem 1U de insulina.
                <br />
                <b>Personalização:</b> Este valor deve ser ajustado com seu médico com base em seu peso, atividade física e resposta individual à insulina.
              </div>
            </li>
            <li>
              <b>Ajuste para Alto Índice Glicêmico (%)</b>: Adiciona uma dose extra para alimentos que elevam a glicemia rapidamente.
              <div className="mt-1 text-xs bg-blue-100 p-2 rounded">
                <b>Exemplo:</b> Um ajuste de 20% para 45g de carboidratos com sensibilidade de 15g/U adiciona 0,6U à dose básica.
                <br />
                <b>Personalização:</b> Use valores mais altos (20-30%) para alimentos como pão branco, arroz branco e doces, e valores mais baixos (0-10%) para alimentos integrais.
              </div>
            </li>
          </ul>
          
          <h5 className="font-medium text-blue-700 mt-3 mb-1">Fórmulas de Cálculo:</h5>
          <div className="bg-white p-3 rounded-lg space-y-2">
            <div>
              <b>Dose Básica</b> = Carboidratos ÷ Sensibilidade
              <div className="text-xs text-gray-500 mt-1">Exemplo: 45g ÷ 15g/U = 3U</div>
            </div>
            <div>
              <b>Dose de Correção</b> = (Carboidratos × Ajuste%) ÷ Sensibilidade
              <div className="text-xs text-gray-500 mt-1">Exemplo: (45g × 20%) ÷ 15g/U = 0,6U</div>
            </div>
            <div>
              <b>Dose Total</b> = Dose Básica + Dose de Correção
              <div className="text-xs text-gray-500 mt-1">Exemplo: 3U + 0,6U = 3,6U</div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-blue-700 flex items-start">
            <Info className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
            <span>A Lantus é uma insulina basal (de ação longa) e deve ser aplicada em horários fixos, independentemente das refeições. Esta calculadora é específica para Novorapid (insulina de ação rápida).</span>
          </div>
        </div>
      )}

      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">Total de Carboidratos</div>
          <div className="text-3xl font-bold text-green-600">{totalCarbs.toFixed(1)}g</div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sensibilidade à Insulina (g/U)
          </label>
          <div className="flex items-center">
            <input
              type="number"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value) || 0)}
              min="1"
              max="50"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="ml-2 text-gray-600">g/U</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Quantos gramas de carboidratos são metabolizados por 1 unidade de insulina
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ajuste para Alto Índice Glicêmico (%)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              value={highGlycemicAdjustment}
              onChange={(e) => setHighGlycemicAdjustment(parseInt(e.target.value))}
              min="0"
              max="50"
              step="5"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="ml-2 text-gray-600 min-w-[40px] text-right">
              {highGlycemicAdjustment}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ajuste para alimentos que elevam a glicemia rapidamente
          </p>
        </div>
      </div>

      {calculation && (
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-800 mb-3">Resultado do Cálculo</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg">
              <div className="text-sm text-gray-500">Dose Básica</div>
              <div className="font-bold text-blue-600">
                {formatNumber(calculation.insulinDose)} U
              </div>
            </div>
            
            {calculation.correctionDose && (
              <div className="bg-white p-3 rounded-lg">
                <div className="text-sm text-gray-500">Dose de Correção</div>
                <div className="font-bold text-orange-600">
                  +{formatNumber(calculation.correctionDose)} U
                </div>
              </div>
            )}
            
            <div className={`bg-white p-3 rounded-lg ${calculation.correctionDose ? 'col-span-2' : ''}`}>
              <div className="text-sm text-gray-500">Dose Total</div>
              <div className="font-bold text-2xl text-blue-700">
                {formatNumber(calculation.totalDose)} U
              </div>
            </div>
          </div>
          
          {calculation.totalDose > 10 && (
            <div className="mt-3 flex items-start text-sm">
              <AlertCircle className="w-4 h-4 text-orange-500 mr-1 mt-0.5 flex-shrink-0" />
              <span className="text-orange-700">
                Dose elevada. Considere verificar os valores e consultar seu médico.
              </span>
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-yellow-700 mb-1">Orientação Médica Importante</h5>
            <p className="text-sm text-yellow-700">
              Esta calculadora é apenas uma <strong>referência</strong> e não substitui a orientação médica profissional.
            </p>
            <ul className="list-disc pl-5 mt-2 text-sm text-yellow-700 space-y-1">
              <li>Ajuste sua sensibilidade à insulina somente com orientação do seu médico</li>
              <li>O ajuste para alto índice glicêmico deve ser personalizado conforme sua resposta individual</li>
              <li>Monitore sua glicemia antes e após as refeições para avaliar a eficácia da dose</li>
              <li>A Novorapid é uma insulina de ação rápida e deve ser aplicada conforme prescrição médica</li>
              <li>A Lantus é uma insulina basal e não deve ser ajustada com base nesta calculadora</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsulinCalculator;