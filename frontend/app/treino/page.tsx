"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import LayoutBase from "@/components/layout/LayoutBase";
import { useDaySelector } from "@/hooks/useDaySelector";
import { useHealth } from "@/contexts/HealthContext";
import { Play, Plus, Clock, Target, TrendingUp, Dumbbell } from "lucide-react";

interface Exercicio {
  id: string;
  nome: string;
  series: number;
  repeticoes: string;
  peso?: number;
  tempo?: number;
  concluido: boolean;
}

interface Treino {
  id: string;
  nome: string;
  tipo: 'forca' | 'cardio' | 'resistencia' | 'recuperacao';
  duracao: number;
  exercicios: Exercicio[];
  concluido: boolean;
  dataInicio?: Date;
  dataFim?: Date;
}

export default function TreinoPage() {
  const { selectedDate, dayData, getDayLabel } = useDaySelector();
  const { state } = useHealth();
  const [treinoAtivo, setTreinoAtivo] = useState<Treino | null>(null);
  const [showNovoTreino, setShowNovoTreino] = useState(false);

  // Treinos mock para desenvolvimento
  const treinosSugeridos: Treino[] = [
    {
      id: '1',
      nome: 'Treino de Força - Peito e Tríceps',
      tipo: 'forca',
      duracao: 45,
      concluido: false,
      exercicios: [
        { id: '1', nome: 'Supino Reto', series: 4, repeticoes: '8-12', peso: 80, concluido: false },
        { id: '2', nome: 'Supino Inclinado', series: 3, repeticoes: '10-12', peso: 70, concluido: false },
        { id: '3', nome: 'Crucifixo', series: 3, repeticoes: '12-15', peso: 25, concluido: false },
        { id: '4', nome: 'Tríceps Testa', series: 3, repeticoes: '10-12', peso: 30, concluido: false },
        { id: '5', nome: 'Tríceps Corda', series: 3, repeticoes: '12-15', peso: 40, concluido: false },
      ]
    },
    {
      id: '2',
      nome: 'Cardio HIIT',
      tipo: 'cardio',
      duracao: 30,
      concluido: false,
      exercicios: [
        { id: '1', nome: 'Burpees', series: 4, repeticoes: '30s', tempo: 30, concluido: false },
        { id: '2', nome: 'Mountain Climbers', series: 4, repeticoes: '30s', tempo: 30, concluido: false },
        { id: '3', nome: 'Jump Squats', series: 4, repeticoes: '30s', tempo: 30, concluido: false },
        { id: '4', nome: 'High Knees', series: 4, repeticoes: '30s', tempo: 30, concluido: false },
      ]
    },
    {
      id: '3',
      nome: 'Recuperação Ativa',
      tipo: 'recuperacao',
      duracao: 20,
      concluido: false,
      exercicios: [
        { id: '1', nome: 'Caminhada Leve', series: 1, repeticoes: '15min', tempo: 900, concluido: false },
        { id: '2', nome: 'Alongamento', series: 1, repeticoes: '5min', tempo: 300, concluido: false },
      ]
    }
  ];

  const iniciarTreino = (treino: Treino) => {
    setTreinoAtivo({
      ...treino,
      dataInicio: new Date()
    });
  };

  const finalizarTreino = () => {
    if (treinoAtivo) {
      const treinoFinalizado = {
        ...treinoAtivo,
        dataFim: new Date(),
        concluido: true
      };
      // Aqui salvaria no contexto/API
      console.log('Treino finalizado:', treinoFinalizado);
      setTreinoAtivo(null);
    }
  };

  const toggleExercicio = (exercicioId: string) => {
    if (treinoAtivo) {
      setTreinoAtivo({
        ...treinoAtivo,
        exercicios: treinoAtivo.exercicios.map(ex => 
          ex.id === exercicioId ? { ...ex, concluido: !ex.concluido } : ex
        )
      });
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'forca': return 'from-red-500 to-orange-500';
      case 'cardio': return 'from-blue-500 to-cyan-500';
      case 'resistencia': return 'from-green-500 to-emerald-500';
      case 'recuperacao': return 'from-purple-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (treinoAtivo) {
    return (
      <LayoutBase title="Treino em Andamento" showDaySelector={false}>
        <div className="space-y-6">
          {/* Header do Treino Ativo */}
          <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{treinoAtivo.nome}</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{treinoAtivo.duracao} min</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-white text-sm bg-gradient-to-r ${getTipoColor(treinoAtivo.tipo)}`}>
                {treinoAtivo.tipo.charAt(0).toUpperCase() + treinoAtivo.tipo.slice(1)}
              </span>
              <button
                onClick={finalizarTreino}
                className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                Finalizar Treino
              </button>
            </div>
          </div>

          {/* Lista de Exercícios */}
          <div className="space-y-3">
            {treinoAtivo.exercicios.map((exercicio, index) => (
              <motion.div
                key={exercicio.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white/30 backdrop-blur-md rounded-xl p-4 border border-white/20 ${
                  exercicio.concluido ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className={`font-semibold ${exercicio.concluido ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {exercicio.nome}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>{exercicio.series} séries</span>
                      <span>{exercicio.repeticoes} reps</span>
                      {exercicio.peso && <span>{exercicio.peso}kg</span>}
                      {exercicio.tempo && <span>{exercicio.tempo}s</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExercicio(exercicio.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      exercicio.concluido
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {exercicio.concluido && '✓'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </LayoutBase>
    );
  }

  return (
    <LayoutBase title={`Treino - ${getDayLabel()}`}>
      <div className="space-y-6">
        {/* Resumo do Dia */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Resumo do Treino</h2>
            <Dumbbell className="w-6 h-6 text-blue-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dayData?.treino ? '1' : '0'}
              </div>
              <div className="text-sm text-gray-600">Treinos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">45</div>
              <div className="text-sm text-gray-600">Min Médio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">4</div>
              <div className="text-sm text-gray-600">Esta Semana</div>
            </div>
          </div>
        </div>

        {/* Treinos Sugeridos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Treinos Sugeridos</h2>
            <button
              onClick={() => setShowNovoTreino(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Novo</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {treinosSugeridos.map((treino, index) => (
              <motion.div
                key={treino.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/30 backdrop-blur-md rounded-xl p-4 border border-white/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{treino.nome}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-white bg-gradient-to-r ${getTipoColor(treino.tipo)}`}>
                        {treino.tipo.charAt(0).toUpperCase() + treino.tipo.slice(1)}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{treino.duracao} min</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="w-4 h-4" />
                        <span>{treino.exercicios.length} exercícios</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => iniciarTreino(treino)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Iniciar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Insights de IA */}
        {state.aiInsights.filter(insight => insight.moduloOrigem === 'treino').length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
              Insights de IA
            </h3>
            <div className="space-y-2">
              {state.aiInsights
                .filter(insight => insight.moduloOrigem === 'treino')
                .map(insight => (
                  <div key={insight.id} className="text-sm text-gray-700">
                    <strong>{insight.titulo}:</strong> {insight.mensagem}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </LayoutBase>
  );
}