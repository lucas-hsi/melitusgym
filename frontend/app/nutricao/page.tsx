"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import LayoutBase from "@/components/layout/LayoutBase";
import { useDaySelector } from "@/hooks/useDaySelector";
import { useHealth } from "@/contexts/HealthContext";
import { 
  Plus, 
  Save,
  Trash2,
  AlertCircle,
  Calculator,
  History,
  Utensils
} from "lucide-react";

// Componentes personalizados
import FoodAutocomplete from "@/components/FoodAutocomplete";
import NutritionCalculator from "@/components/NutritionCalculator";
import InsulinCalculator from "@/components/InsulinCalculator";
import MealHistory from "@/components/MealHistory";

// Serviços
import tacoService, { TacoFood, TacoNutrient } from "@/lib/tacoService";
import mealLogService, { MealLogCreate, MealLog } from "@/lib/mealLogService";

// Tipos
interface CurrentDishItem {
  id: string;
  food: TacoFood;
  grams: number;
  calculatedNutrients: TacoNutrient;
}

type ActiveTab = 'meal' | 'history' | 'calculator';

export default function NutricaoPage() {
  const { selectedDate, getDayLabel } = useDaySelector();
  const { state } = useHealth();
  
  // Estado para controle de abas
  const [activeTab, setActiveTab] = useState<ActiveTab>('meal');
  
  // Estado para o prato atual
  const [currentDish, setCurrentDish] = useState<CurrentDishItem[]>([]);
  
  // Estado para totais nutricionais
  const [dishTotals, setDishTotals] = useState<TacoNutrient>({
    energy_kcal: 0,
    carbohydrates: 0,
    proteins: 0,
    fat: 0,
    fiber: 0,
    sodium: 0
  });
  
  // Estado para alimento selecionado
  const [selectedFood, setSelectedFood] = useState<TacoFood | null>(null);
  
  // Estado para histórico de refeições
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  
  // Estado para controle de carregamento
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para mensagens
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  
  // Estado para notas da refeição
  const [mealNotes, setMealNotes] = useState('');
  
  // Estado para momento da refeição
  const [mealTime, setMealTime] = useState('lunch');

  // Carregar histórico de refeições ao iniciar
  useEffect(() => {
    loadMealHistory();
  }, []);
  
  // Recalcular totais quando o prato atual mudar
  useEffect(() => {
    calculateDishTotals();
  }, [currentDish]);

  // Função para carregar histórico de refeições
  const loadMealHistory = async () => {
    setIsLoading(true);
    try {
      const logs = await mealLogService.getRecentMealLogs(7);
      setMealLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar histórico de refeições:', error);
      setMessage({
        type: 'error',
        text: 'Não foi possível carregar o histórico de refeições.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para calcular totais do prato
  const calculateDishTotals = () => {
    if (currentDish.length === 0) {
      setDishTotals({
        energy_kcal: 0,
        carbohydrates: 0,
        proteins: 0,
        fat: 0,
        fiber: 0,
        sodium: 0
      });
      return;
    }
    
    const totals: TacoNutrient = {
      energy_kcal: 0,
      carbohydrates: 0,
      proteins: 0,
      fat: 0,
      fiber: 0,
      sodium: 0
    };
    
    currentDish.forEach(item => {
      Object.keys(item.calculatedNutrients).forEach(key => {
        const nutrientKey = key as keyof TacoNutrient;
        const value = item.calculatedNutrients[nutrientKey];
        
        if (value !== undefined && value !== null) {
          totals[nutrientKey] = (totals[nutrientKey] || 0) + value;
        }
      });
    });
    
    setDishTotals(totals);
  };

  // Função para adicionar alimento ao prato
  const handleAddFoodToDish = (food: TacoFood, grams: number, calculatedNutrients: TacoNutrient) => {
    const newItem: CurrentDishItem = {
      id: Date.now().toString(),
      food,
      grams,
      calculatedNutrients
    };
    
    setCurrentDish(prev => [...prev, newItem]);
    setSelectedFood(null);
    
    // Mostrar mensagem de sucesso
    setMessage({
      type: 'success',
      text: `${food.name} adicionado ao prato.`
    });
    
    // Limpar mensagem após 3 segundos
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  // Função para remover alimento do prato
  const handleRemoveFoodFromDish = (id: string) => {
    setCurrentDish(prev => prev.filter(item => item.id !== id));
  };

  // Função para salvar refeição
  const handleSaveMeal = async () => {
    if (currentDish.length === 0) {
      setMessage({
        type: 'error',
        text: 'Adicione pelo menos um alimento ao prato atual.'
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Preparar dados para salvar
      const mealLogData: MealLogCreate = {
        meal_time: mealTime,
        meal_date: selectedDate.toISOString(),
        items: currentDish.map(item => ({
          id: item.id,
          name: item.food.name,
          source: item.food.source,
          grams: item.grams,
          nutrients: item.calculatedNutrients
        })),
        total_nutrients: dishTotals,
        notes: mealNotes || undefined
      };
      
      // Salvar refeição
      await mealLogService.createMealLog(mealLogData);
      
      // Limpar prato atual
      setCurrentDish([]);
      setMealNotes('');
      
      // Recarregar histórico
      await loadMealHistory();
      
      // Mostrar mensagem de sucesso
      setMessage({
        type: 'success',
        text: 'Refeição salva com sucesso!'
      });
      
      // Mudar para a aba de histórico
      setActiveTab('history');
    } catch (error) {
      console.error('Erro ao salvar refeição:', error);
      setMessage({
        type: 'error',
        text: 'Não foi possível salvar a refeição.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para editar refeição
  const handleEditMeal = (mealLog: MealLog) => {
    // Converter itens do histórico para o formato do prato atual
    const dishItems: CurrentDishItem[] = mealLog.items.map(item => ({
      id: item.id,
      food: {
        id: item.id,
        source: item.source,
        name: item.name,
        nutrients_per_100g: {} // Não temos os dados originais, apenas os calculados
      },
      grams: item.grams,
      calculatedNutrients: item.nutrients
    }));
    
    // Atualizar estado
    setCurrentDish(dishItems);
    setMealTime(mealLog.meal_time);
    setMealNotes(mealLog.notes || '');
    setDishTotals(mealLog.total_nutrients);
    
    // Mudar para a aba de refeição
    setActiveTab('meal');
    
    // Mostrar mensagem
    setMessage({
      type: 'info',
      text: 'Editando refeição. Salve para atualizar.'
    });
  };

  // Função para selecionar alimento
  const handleSelectFood = (food: TacoFood) => {
    setSelectedFood(food);
  };

  // Renderiza mensagem
  const renderMessage = () => {
    if (!message) return null;
    
    const bgColor = message.type === 'success' 
      ? 'bg-green-100 border-green-500 text-green-700' 
      : message.type === 'error'
        ? 'bg-red-100 border-red-500 text-red-700'
        : 'bg-blue-100 border-blue-500 text-blue-700';
    
    return (
      <div className={`p-3 rounded-lg border ${bgColor} mb-4 flex items-center`}>
        {message.type === 'success' && (
          <div className="p-1 bg-green-200 rounded-full mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-700" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {message.type === 'error' && (
          <AlertCircle className="w-5 h-5 text-red-700 mr-2" />
        )}
        {message.type === 'info' && (
          <div className="p-1 bg-blue-200 rounded-full mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <span>{message.text}</span>
      </div>
    );
  };

  return (
    <LayoutBase>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Nutrição</h1>
          <p className="text-gray-600">{getDayLabel()}</p>
        </div>
        
        {/* Mensagem */}
        {renderMessage()}
        
        {/* Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-1 mb-6 flex">
          <button
            onClick={() => setActiveTab('meal')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'meal'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Utensils className="w-5 h-5 inline mr-2" />
            Refeição
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <History className="w-5 h-5 inline mr-2" />
            Histórico
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'calculator'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Calculator className="w-5 h-5 inline mr-2" />
            Calculadora
          </button>
        </div>
        
        {/* Conteúdo da aba */}
        <div className="space-y-6">
          {/* Aba de Refeição */}
          {activeTab === 'meal' && (
            <>
              {/* Busca de Alimentos */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Buscar Alimentos</h3>
                <FoodAutocomplete onSelect={handleSelectFood} />
              </div>
              
              {/* Prato Atual */}
              {currentDish.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Prato Atual</h3>
                    <div className="text-sm text-gray-600">
                      {currentDish.length} {currentDish.length === 1 ? 'item' : 'itens'}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {currentDish.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-white/80 rounded-lg p-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{item.food.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.grams}g • {item.calculatedNutrients.carbohydrates?.toFixed(1) || '0'}g carbs
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFoodFromDish(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Totais */}
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Totais Nutricionais</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-blue-600">{dishTotals.energy_kcal?.toFixed(0) || '0'}</div>
                        <div className="text-gray-600">kcal</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">{dishTotals.carbohydrates?.toFixed(1) || '0'}</div>
                        <div className="text-gray-600">carbs (g)</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-purple-600">{dishTotals.proteins?.toFixed(1) || '0'}</div>
                        <div className="text-gray-600">proteínas (g)</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opções da Refeição */}
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Momento da Refeição
                        </label>
                        <select
                          value={mealTime}
                          onChange={(e) => setMealTime(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="breakfast">Café da Manhã</option>
                          <option value="lunch">Almoço</option>
                          <option value="dinner">Jantar</option>
                          <option value="snack">Lanche</option>
                          <option value="supper">Ceia</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações (opcional)
                        </label>
                        <input
                          type="text"
                          value={mealNotes}
                          onChange={(e) => setMealNotes(e.target.value)}
                          placeholder="Ex: Refeição pré-treino"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSaveMeal}
                    disabled={isSaving}
                    className="w-full bg-green-500 text-white py-3 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Refeição
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {/* Calculadora de Insulina (se tiver carboidratos) */}
              {dishTotals.carbohydrates && dishTotals.carbohydrates > 0 && (
                <InsulinCalculator totalCarbs={dishTotals.carbohydrates} />
              )}
            </>
          )}
          
          {/* Aba de Histórico */}
          {activeTab === 'history' && (
            <MealHistory days={7} onEditMeal={handleEditMeal} />
          )}
          
          {/* Aba de Calculadora */}
          {activeTab === 'calculator' && (
            <InsulinCalculator totalCarbs={0} />
          )}
        </div>
      </div>
      
      {/* Modal de Cálculo Nutricional */}
      {selectedFood && (
        <NutritionCalculator
          food={selectedFood}
          onAddToDish={handleAddFoodToDish}
          onCancel={() => setSelectedFood(null)}
        />
      )}
    </LayoutBase>
  );
}

export const dynamic = 'force-dynamic';