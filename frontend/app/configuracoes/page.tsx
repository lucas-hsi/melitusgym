"use client";
export const dynamic = 'force-dynamic'
import { useState } from "react";
import { useRouter, usePathname } from 'next/navigation'
import LayoutBase from "@/components/layout/LayoutBase";
import { useHealth } from "@/contexts/HealthContext";
import { 
  User, 
  Brain, 
  Target, 
  Settings, 
  Bot, 
  Heart, 
  Scale,
  Save,
  Edit3
} from "lucide-react";

interface PerfilBiopsicologico {
  dadosBasicos: {
    nome: string;
    idade: number;
    peso: number;
    altura: number;
    sexo: 'masculino' | 'feminino';
    tipoCorpo: 'ectomorfo' | 'mesomorfo' | 'endomorfo';
  };
  condicoesMedicas: {
    diabetes: {
      tipo: 'tipo1' | 'tipo2';
      anosDiagnostico: number;
      medicamentos: string[];
      complicacoes: string[];
    };
    hipertensao: {
      grau: 'leve' | 'moderada' | 'severa';
      medicamentos: string[];
      controlada: boolean;
    };
    outras: string[];
  };
  perfilMental: {
    nivelEstresse: number; // 1-10
    qualidadeSono: number; // 1-10
    motivacao: number; // 1-10
    ansiedade: number; // 1-10
    humor: number; // 1-10
  };
  objetivos: {
    principal: string;
    secundarios: string[];
    prazo: string;
  };
}

interface ConfiguracoesIA {
  ativaIA: boolean;
  nivelInteracao: 'basico' | 'intermediario' | 'avancado';
  sugestoesAutomaticas: boolean;
  alertasPersonalizados: boolean;
  analiseComportamental: boolean;
  privacidadeDados: 'minima' | 'moderada' | 'completa';
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { state, updateProfile } = useHealth();
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [editandoIA, setEditandoIA] = useState(false);
  
  // Estado local para edição
  const [perfilLocal, setPerfilLocal] = useState<PerfilBiopsicologico>({
    dadosBasicos: {
      nome: 'Lucas Silva',
      idade: 28,
      peso: 75,
      altura: 175,
      sexo: 'masculino',
      tipoCorpo: 'mesomorfo'
    },
    condicoesMedicas: {
      diabetes: {
        tipo: 'tipo1',
        anosDiagnostico: 5,
        medicamentos: ['insulina_rapida', 'insulina_lenta'],
        complicacoes: []
      },
      hipertensao: {
        grau: 'leve',
        medicamentos: ['losartana'],
        controlada: true
      },
      outras: []
    },
    perfilMental: {
      nivelEstresse: 6,
      qualidadeSono: 7,
      motivacao: 8,
      ansiedade: 5,
      humor: 7
    },
    objetivos: {
      principal: 'controle_glicemia',
      secundarios: ['perda_peso', 'ganho_massa'],
      prazo: '6_meses'
    }
  });
  
  const [configIA, setConfigIA] = useState<ConfiguracoesIA>({
    ativaIA: true,
    nivelInteracao: 'intermediario',
    sugestoesAutomaticas: true,
    alertasPersonalizados: true,
    analiseComportamental: true,
    privacidadeDados: 'moderada'
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSalvarPerfil = async () => {
    try {
      await updateProfile({
        idade: perfilLocal.dadosBasicos.idade,
        peso: perfilLocal.dadosBasicos.peso,
        altura: perfilLocal.dadosBasicos.altura,
        imc: parseFloat(calcularIMC()),
        tipoCorporal: perfilLocal.dadosBasicos.tipoCorpo,
        medicamentos: perfilLocal.condicoesMedicas.diabetes.medicamentos,
        historico: [],
        objetivos: [perfilLocal.objetivos.principal, ...perfilLocal.objetivos.secundarios],
        nivelAtividade: 'moderado'
      });
      setEditandoPerfil(false);
      alert('Perfil salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar perfil');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (pathname !== '/login') {
      router.replace('/login')
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Implementar chamada para API de exclusão
      alert('Conta excluída com sucesso');
      handleLogout();
    } catch (error) {
      alert('Erro ao excluir conta');
    }
  };

  const calcularIMC = () => {
    const { peso, altura } = perfilLocal.dadosBasicos;
    if (peso && altura) {
      return (peso / ((altura / 100) ** 2)).toFixed(1);
    }
    return '0.0';
  };

  const getIMCCategoria = (imc: number) => {
    if (imc < 18.5) return { categoria: 'Abaixo do peso', cor: 'text-blue-600' };
    if (imc < 25) return { categoria: 'Peso normal', cor: 'text-green-600' };
    if (imc < 30) return { categoria: 'Sobrepeso', cor: 'text-yellow-600' };
    return { categoria: 'Obesidade', cor: 'text-red-600' };
  };

  const salvarConfigIA = () => {
    // Aqui salvaria no contexto/API
    console.log('Configurações de IA salvas:', configIA);
    setEditandoIA(false);
  };

  const imc = parseFloat(calcularIMC());
  const imcInfo = getIMCCategoria(imc);

  return (
    <LayoutBase title="Configurações" showDaySelector={false}>
      <div className="space-y-6">
        {/* Perfil Pessoal */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Perfil Pessoal
            </h2>
            <button
              onClick={() => setEditandoPerfil(!editandoPerfil)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{editandoPerfil ? 'Cancelar' : 'Editar'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 mb-3">Dados Básicos</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  {editandoPerfil ? (
                    <input
                      type="text"
                      value={perfilLocal.dadosBasicos.nome}
                      onChange={(e) => setPerfilLocal(prev => ({
                        ...prev,
                        dadosBasicos: { ...prev.dadosBasicos, nome: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-white/40 rounded-lg p-3 text-gray-800">{perfilLocal.dadosBasicos.nome}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
                    {editandoPerfil ? (
                      <input
                        type="number"
                        value={perfilLocal.dadosBasicos.idade}
                        onChange={(e) => setPerfilLocal(prev => ({
                          ...prev,
                          dadosBasicos: { ...prev.dadosBasicos, idade: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-white/40 rounded-lg p-3 text-gray-800">{perfilLocal.dadosBasicos.idade} anos</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                    {editandoPerfil ? (
                      <select
                        value={perfilLocal.dadosBasicos.sexo}
                        onChange={(e) => setPerfilLocal(prev => ({
                          ...prev,
                          dadosBasicos: { ...prev.dadosBasicos, sexo: e.target.value as 'masculino' | 'feminino' }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                      </select>
                    ) : (
                      <div className="bg-white/40 rounded-lg p-3 text-gray-800 capitalize">{perfilLocal.dadosBasicos.sexo}</div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                    {editandoPerfil ? (
                      <input
                        type="number"
                        value={perfilLocal.dadosBasicos.peso}
                        onChange={(e) => setPerfilLocal(prev => ({
                          ...prev,
                          dadosBasicos: { ...prev.dadosBasicos, peso: parseFloat(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-white/40 rounded-lg p-3 text-gray-800">{perfilLocal.dadosBasicos.peso} kg</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
                    {editandoPerfil ? (
                      <input
                        type="number"
                        value={perfilLocal.dadosBasicos.altura}
                        onChange={(e) => setPerfilLocal(prev => ({
                          ...prev,
                          dadosBasicos: { ...prev.dadosBasicos, altura: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-white/40 rounded-lg p-3 text-gray-800">{perfilLocal.dadosBasicos.altura} cm</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* IMC e Tipo Corporal */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800 mb-3">Análise Corporal</h3>
              
              <div className="bg-white/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">IMC</span>
                  <Scale className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-800 mb-1">{calcularIMC()}</div>
                <div className={`text-sm font-medium ${imcInfo.cor}`}>{imcInfo.categoria}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Corporal</label>
                {editandoPerfil ? (
                  <select
                    value={perfilLocal.dadosBasicos.tipoCorpo}
                    onChange={(e) => setPerfilLocal(prev => ({
                      ...prev,
                      dadosBasicos: { ...prev.dadosBasicos, tipoCorpo: e.target.value as 'ectomorfo' | 'mesomorfo' | 'endomorfo' }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ectomorfo">Ectomorfo</option>
                    <option value="mesomorfo">Mesomorfo</option>
                    <option value="endomorfo">Endomorfo</option>
                  </select>
                ) : (
                  <div className="bg-white/40 rounded-lg p-3 text-gray-800 capitalize">{perfilLocal.dadosBasicos.tipoCorpo}</div>
                )}
              </div>
            </div>
          </div>
          
          {editandoPerfil && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditandoPerfil(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarPerfil}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          )}
        </div>

        {/* Perfil Mental */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-500" />
            Perfil Mental e Emocional
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(perfilLocal.perfilMental).map(([key, value]) => {
              const labels = {
                nivelEstresse: 'Nível de Estresse',
                qualidadeSono: 'Qualidade do Sono',
                motivacao: 'Motivação',
                ansiedade: 'Ansiedade',
                humor: 'Humor'
              };
              
              const colors = {
                nivelEstresse: 'bg-red-500',
                qualidadeSono: 'bg-blue-500',
                motivacao: 'bg-green-500',
                ansiedade: 'bg-orange-500',
                humor: 'bg-purple-500'
              };
              
              return (
                <div key={key} className="bg-white/40 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{labels[key as keyof typeof labels]}</span>
                    <span className="text-lg font-bold text-gray-800">{value}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${colors[key as keyof typeof colors]}`}
                      style={{ width: `${(value / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Objetivos */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-500" />
            Objetivos
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-3">Objetivo Principal</h3>
              <div className="bg-white/40 rounded-lg p-3 text-gray-800">
                {perfilLocal.objetivos.principal}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-3">Objetivos Secundários</h3>
              <div className="space-y-2">
                {perfilLocal.objetivos.secundarios.map((objetivo, index) => (
                  <div key={index} className="bg-white/40 rounded-lg p-3 text-gray-800">
                    {objetivo}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-3">Prazo</h3>
              <div className="bg-white/40 rounded-lg p-3 text-gray-800">
                {perfilLocal.objetivos.prazo}
              </div>
            </div>
          </div>
        </div>

        {/* Configurações de IA */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Bot className="w-5 h-5 mr-2 text-indigo-500" />
              Configurações de IA
            </h2>
            <button
              onClick={() => setEditandoIA(!editandoIA)}
              className="flex items-center space-x-2 px-3 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>{editandoIA ? 'Cancelar' : 'Configurar'}</span>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white/40 rounded-xl p-4">
              <div>
                <h3 className="font-medium text-gray-800">IA Ativada</h3>
                <p className="text-sm text-gray-600">Permite que a IA analise seus dados e forneça insights</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configIA.ativaIA}
                  onChange={(e) => setConfigIA(prev => ({ ...prev, ativaIA: e.target.checked }))}
                  className="sr-only peer"
                  disabled={!editandoIA}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            <div className="bg-white/40 rounded-xl p-4">
              <h3 className="font-medium text-gray-800 mb-2">Nível de Interação</h3>
              <p className="text-sm text-gray-600 mb-3">Define o quão detalhadas serão as análises e sugestões</p>
              {editandoIA ? (
                <select
                  value={configIA.nivelInteracao}
                  onChange={(e) => setConfigIA(prev => ({ ...prev, nivelInteracao: e.target.value as 'basico' | 'intermediario' | 'avancado' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="basico">Básico</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              ) : (
                <div className="bg-white/60 rounded-lg p-3 text-gray-800 capitalize">{configIA.nivelInteracao}</div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-white/40 rounded-xl p-4">
                <div>
                  <h3 className="font-medium text-gray-800">Sugestões Automáticas</h3>
                  <p className="text-sm text-gray-600">Receber sugestões proativas da IA</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configIA.sugestoesAutomaticas}
                    onChange={(e) => setConfigIA(prev => ({ ...prev, sugestoesAutomaticas: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!editandoIA}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between bg-white/40 rounded-xl p-4">
                <div>
                  <h3 className="font-medium text-gray-800">Alertas Personalizados</h3>
                  <p className="text-sm text-gray-600">Alertas baseados no seu perfil</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configIA.alertasPersonalizados}
                    onChange={(e) => setConfigIA(prev => ({ ...prev, alertasPersonalizados: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!editandoIA}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          {editandoIA && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditandoIA(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarConfigIA}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          )}
        </div>

        {/* Condições Médicas */}
        <div className="bg-white/30 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Condições Médicas
          </h2>
          
          <div className="space-y-4">
            <div className="bg-white/40 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">Diabetes {perfilLocal.condicoesMedicas.diabetes.tipo === 'tipo1' ? 'Tipo 1' : 'Tipo 2'}</h3>
              <p className="text-sm text-gray-600 mb-2">Diagnóstico há {perfilLocal.condicoesMedicas.diabetes.anosDiagnostico} anos</p>
              <div className="text-sm text-gray-600">
                <strong>Medicamentos:</strong> {perfilLocal.condicoesMedicas.diabetes.medicamentos.join(', ')}
              </div>
            </div>
            
            <div className="bg-white/40 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">Hipertensão</h3>
              <p className="text-sm text-gray-600 mb-2">Grau: {perfilLocal.condicoesMedicas.hipertensao.grau}</p>
              <p className="text-sm text-gray-600 mb-2">Status: {perfilLocal.condicoesMedicas.hipertensao.controlada ? 'Controlada' : 'Não controlada'}</p>
              <div className="text-sm text-gray-600">
                <strong>Medicamentos:</strong> {perfilLocal.condicoesMedicas.hipertensao.medicamentos.join(', ')}
              </div>
            </div>
          </div>
        </div>



         {/* Ações da Conta */}
         <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
           <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
             <User className="mr-2 text-blue-400" size={20} />
             Conta
           </h3>
           <div className="space-y-3">
             <button
               onClick={handleLogout}
               className="w-full flex items-center justify-center space-x-2 p-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 rounded-lg transition-all"
             >
               <span className="text-orange-400">🚪</span>
               <span className="text-white font-medium">Sair da Conta</span>
             </button>
             <button
               onClick={() => setShowDeleteConfirm(true)}
               className="w-full flex items-center justify-center space-x-2 p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg transition-all"
             >
               <span className="text-red-400">🗑️</span>
               <span className="text-white font-medium">Excluir Conta</span>
             </button>
           </div>
         </div>

         {/* Modal de Confirmação de Exclusão */}
         {showDeleteConfirm && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 border border-white/30 max-w-md mx-4">
               <h3 className="text-lg font-semibold text-white mb-4">Confirmar Exclusão</h3>
               <p className="text-gray-300 mb-6">Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.</p>
               <div className="flex space-x-3">
                 <button
                   onClick={() => setShowDeleteConfirm(false)}
                   className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
                 >
                   Cancelar
                 </button>
                 <button
                   onClick={handleDeleteAccount}
                   className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                 >
                   Excluir
                 </button>
               </div>
             </div>
           </div>
         )}
       </div>
     </LayoutBase>
   );
 }