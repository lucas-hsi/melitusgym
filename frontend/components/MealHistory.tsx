'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ChevronDown, ChevronUp, Trash2, Edit, Info } from 'lucide-react';
import mealLogService, { MealLog } from '@/lib/mealLogService';

interface MealHistoryProps {
  days?: number;
  limit?: number;
  onEditMeal?: (mealLog: MealLog) => void;
}

const MealHistory: React.FC<MealHistoryProps> = ({
  days = 7,
  limit = 10,
  onEditMeal
}) => {
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar histórico de refeições
  useEffect(() => {
    loadMealHistory();
  }, [days, limit]);

  // Função para carregar o histórico de refeições
  const loadMealHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const logs = await mealLogService.getRecentMealLogs(days);
      setMealLogs(logs);
    } catch (err) {
      console.error('Erro ao carregar histórico de refeições:', err);
      setError('Não foi possível carregar o histórico de refeições.');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para excluir uma refeição
  const handleDeleteMeal = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta refeição?')) {
      return;
    }
    
    try {
      await mealLogService.deleteMealLog(id);
      setMealLogs(mealLogs.filter(log => log.id !== id));
    } catch (err) {
      console.error('Erro ao excluir refeição:', err);
      alert('Não foi possível excluir a refeição.');
    }
  };

  // Função para alternar a expansão de uma refeição
  const toggleExpand = (id: number) => {
    setExpandedMealId(expandedMealId === id ? null : id);
  };

  // Função para formatar o momento da refeição
  const formatMealTime = (mealTime: string): string => {
    const mealTimeMap: Record<string, string> = {
      'breakfast': 'Café da Manhã',
      'lunch': 'Almoço',
      'dinner': 'Jantar',
      'snack': 'Lanche',
      'supper': 'Ceia'
    };
    
    return mealTimeMap[mealTime] || mealTime;
  };

  // Renderiza o conteúdo do histórico
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (error) {
      // Mensagem neutra e profissional, sem expor erro técnico
      return (
        <div className="bg-white/70 backdrop-blur-sm p-5 rounded-xl text-center border border-gray-200">
          <p className="text-gray-700 text-sm">Não há dados para exibir agora.</p>
          <button
            onClick={loadMealHistory}
            className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors text-gray-800"
          >
            Recarregar
          </button>
        </div>
      );
    }
    
    if (mealLogs.length === 0) {
      const emptyCopy = days <= 1
        ? 'Hoje não foi anotado nenhuma refeição — anote a sua primeira refeição.'
        : `Nenhuma refeição registrada nos últimos ${days} dias.`;
      return (
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl text-center border border-gray-200">
          <p className="text-gray-700 text-sm">{emptyCopy}</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {mealLogs.map(meal => (
          <div key={meal.id} className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(meal.id)}
            >
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-100 mr-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{formatMealTime(meal.meal_time)}</h4>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{mealLogService.formatDate(meal.meal_date)}</span>
                      <span className="mx-1">•</span>
                      <span>{mealLogService.formatTime(meal.meal_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-right mr-2">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="font-medium text-gray-800">
                    {meal.total_nutrients.carbohydrates?.toFixed(1) || '0'} g carbs
                  </div>
                </div>
                {expandedMealId === meal.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
            
              {/* Expanded Content */}
              {expandedMealId === meal.id && (
                <div className="p-4 border-t border-gray-100">
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Itens da Refeição</h5>
                    <div className="space-y-2">
                      {meal.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-800">{item.name}</div>
                            <div className="text-sm text-gray-500">{item.grams}g</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {item.nutrients.carbohydrates?.toFixed(1) || '0'} g carbs
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.nutrients.energy_kcal?.toFixed(0) || '0'} kcal
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nutrition Summary */}
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <h5 className="font-medium text-gray-700 mb-2">Resumo Nutricional</h5>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-white p-2 rounded-lg text-center">
                        <div className="text-xs text-gray-500">Calorias</div>
                        <div className="font-bold text-gray-800">
                          {meal.total_nutrients.energy_kcal?.toFixed(0) || '0'} kcal
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <div className="text-xs text-gray-500">Carboidratos</div>
                        <div className="font-bold text-green-600">
                          {meal.total_nutrients.carbohydrates?.toFixed(1) || '0'} g
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg text-center">
                        <div className="text-xs text-gray-500">Proteínas</div>
                        <div className="font-bold text-blue-600">
                          {meal.total_nutrients.proteins?.toFixed(1) || '0'} g
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Summary */}
                  {(meal.glucose_value !== undefined || meal.insulin_applied_units !== undefined || meal.insulin_recommended_units !== undefined) && (
                    <div className="bg-green-50 p-3 rounded-lg mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">Dados Clínicos</h5>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white p-2 rounded-lg text-center">
                          <div className="text-xs text-gray-500">Glicemia</div>
                          <div className="font-bold text-red-600">
                            {meal.glucose_value !== undefined ? `${meal.glucose_value} mg/dL` : '—'}
                          </div>
                          {meal.glucose_measured && (
                            <div className="text-[10px] text-gray-500 mt-1">{meal.glucose_measure_timing === 'before' ? 'antes' : meal.glucose_measure_timing === 'after' ? 'depois' : 'medida'}</div>
                          )}
                        </div>
                        <div className="bg-white p-2 rounded-lg text-center">
                          <div className="text-xs text-gray-500">Insulina Aplicada</div>
                          <div className="font-bold text-purple-600">
                            {meal.insulin_applied_units !== undefined ? `${meal.insulin_applied_units} U` : '—'}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg text-center">
                          <div className="text-xs text-gray-500">Insulina Recomendada</div>
                          <div className="font-bold text-purple-600">
                            {meal.insulin_recommended_units !== undefined ? `${meal.insulin_recommended_units} U` : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Registrado: {mealLogService.formatDate(meal.recorded_at)} • {mealLogService.formatTime(meal.recorded_at)}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {meal.notes && (
                    <div className="mb-4">
                      <div className="flex items-center text-sm text-gray-700 mb-1">
                        <Info className="w-4 h-4 mr-1" />
                        <span>Observações</span>
                      </div>
                      <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                        {meal.notes}
                      </p>
                    </div>
                  )}
                
                {/* Actions */}
                <div className="flex justify-end space-x-2 mt-4">
                  {onEditMeal && (
                    <button
                      onClick={() => onEditMeal(meal)}
                      className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
                    className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Histórico de Refeições</h3>
        <button
          onClick={loadMealHistory}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Atualizar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      
      {renderContent()}
    </div>
  );
};

export default MealHistory;