'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Bell, Trash2, Edit3, Clock, Droplets, Utensils, Activity, Heart, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useNotifications } from '@/lib/notifications';

interface PushAlarm {
  id: number;
  type: 'water' | 'post_meal' | 'glucose' | 'bp' | 'custom';
  schedule: string;
  payload?: {
    title?: string;
    body?: string;
    route?: string;
  };
  active: boolean;
  last_fire_at?: string;
  created_at: string;
  updated_at: string;
}

interface AlarmTemplate {
  type: 'water' | 'post_meal' | 'glucose' | 'bp' | 'custom';
  title: string;
  description: string;
  icon: React.ReactNode;
  defaultPayload: {
    title: string;
    body: string;
    route: string;
  };
}

const alarmTemplates: AlarmTemplate[] = [
  {
    type: 'water',
    title: 'Hidratação',
    description: 'Lembrete para beber água',
    icon: <Droplets className="w-5 h-5 text-blue-500" />,
    defaultPayload: {
      title: '💧 Hora de se hidratar!',
      body: 'Lembre-se de beber água para manter sua saúde em dia.',
      route: '/dashboard'
    }
  },
  {
    type: 'post_meal',
    title: 'Pós-refeição',
    description: 'Medição de glicemia após refeições',
    icon: <Utensils className="w-5 h-5 text-orange-500" />,
    defaultPayload: {
      title: '🍽️ Medição pós-refeição',
      body: 'Hora de medir sua glicemia após a refeição.',
      route: '/saude?post_refeicao=1'
    }
  },
  {
    type: 'glucose',
    title: 'Glicemia',
    description: 'Medição regular de glicose',
    icon: <Activity className="w-5 h-5 text-red-500" />,
    defaultPayload: {
      title: '🩸 Medição de glicemia',
      body: 'Não esqueça de medir sua glicemia.',
      route: '/saude?glucose=1'
    }
  },
  {
    type: 'bp',
    title: 'Pressão Arterial',
    description: 'Medição de pressão arterial',
    icon: <Heart className="w-5 h-5 text-pink-500" />,
    defaultPayload: {
      title: '❤️ Medição de pressão',
      body: 'Hora de verificar sua pressão arterial.',
      route: '/saude?pressure=1'
    }
  },
  {
    type: 'custom',
    title: 'Personalizado',
    description: 'Criar lembrete personalizado',
    icon: <User className="w-5 h-5 text-purple-500" />,
    defaultPayload: {
      title: '⏰ Lembrete personalizado',
      body: 'Você tem um lembrete agendado.',
      route: '/dashboard'
    }
  }
];

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<PushAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<PushAlarm | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AlarmTemplate | null>(null);
  
  const { isInitialized, token, error: notificationError, initialize: initializeNotifications } = useNotifications();
  
  // Form state
  const [formData, setFormData] = useState<{
    type: 'water' | 'post_meal' | 'glucose' | 'bp' | 'custom';
    schedule: string;
    title: string;
    body: string;
    route: string;
    active: boolean;
  }>({
    type: 'water',
    schedule: '',
    title: '',
    body: '',
    route: '/dashboard',
    active: true
  });
  
  // Carregar alarmes
  const loadAlarms = async () => {
    try {
      const response = await api.get('/notifications/alarms');
      setAlarms(response.data);
    } catch (error) {
      console.error('Erro ao carregar alarmes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadAlarms();
  }, []);
  
  // Inicializar notificações se necessário
  useEffect(() => {
    if (!isInitialized && !notificationError) {
      initializeNotifications();
    }
  }, [isInitialized, notificationError, initializeNotifications]);
  
  // Resetar formulário
  const resetForm = () => {
    setFormData({
      type: 'water',
      schedule: '',
      title: '',
      body: '',
      route: '/dashboard',
      active: true
    });
    setSelectedTemplate(null);
    setEditingAlarm(null);
  };
  
  // Selecionar template
  const selectTemplate = (template: AlarmTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      type: template.type,
      schedule: '',
      title: template.defaultPayload.title,
      body: template.defaultPayload.body,
      route: template.defaultPayload.route,
      active: true
    });
  };
  
  // Editar alarme
  const editAlarm = (alarm: PushAlarm) => {
    setEditingAlarm(alarm);
    setFormData({
      type: alarm.type,
      schedule: alarm.schedule,
      title: alarm.payload?.title || '',
      body: alarm.payload?.body || '',
      route: alarm.payload?.route || '/dashboard',
      active: alarm.active
    });
    setShowCreateModal(true);
  };
  
  // Salvar alarme
  const saveAlarm = async () => {
    try {
      const payload = {
        type: formData.type,
        schedule: formData.schedule,
        payload: {
          title: formData.title,
          body: formData.body,
          route: formData.route
        },
        active: formData.active
      };
      
      if (editingAlarm) {
        await api.put(`/notifications/alarms/${editingAlarm.id}`, payload);
      } else {
        await api.post('/notifications/alarms', payload);
      }
      
      await loadAlarms();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar alarme:', error);
    }
  };
  
  // Deletar alarme
  const deleteAlarm = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este alarme?')) return;
    
    try {
      await api.delete(`/notifications/alarms/${id}`);
      await loadAlarms();
    } catch (error) {
      console.error('Erro ao deletar alarme:', error);
    }
  };
  
  // Toggle ativo/inativo
  const toggleAlarm = async (alarm: PushAlarm) => {
    try {
      await api.put(`/notifications/alarms/${alarm.id}`, {
        ...alarm,
        active: !alarm.active
      });
      await loadAlarms();
    } catch (error) {
      console.error('Erro ao alterar status do alarme:', error);
    }
  };
  
  // Formatar data para input datetime-local
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };
  
  // Obter template por tipo
  const getTemplateByType = (type: string) => {
    return alarmTemplates.find(t => t.type === type);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alarmes e Notificações</h1>
          <p className="text-gray-600">Configure lembretes para suas medições e cuidados de saúde</p>
          
          {/* Status das notificações */}
          <div className="mt-4 p-4 rounded-lg bg-white/70 backdrop-blur-sm border border-white/20">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <span className="font-medium">Status das Notificações:</span>
              {token ? (
                <span className="text-green-600">✓ Ativas</span>
              ) : notificationError ? (
                <span className="text-red-600">✗ {notificationError}</span>
              ) : (
                <span className="text-yellow-600">⏳ Configurando...</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Botão criar alarme */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Alarme
          </button>
        </div>
        
        {/* Lista de alarmes */}
        <div className="space-y-4">
          {alarms.length === 0 ? (
            <div className="text-center py-12 bg-white/70 backdrop-blur-sm rounded-lg border border-white/20">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum alarme configurado</h3>
              <p className="text-gray-600 mb-4">Crie seu primeiro alarme para receber lembretes importantes</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Criar Alarme
              </button>
            </div>
          ) : (
            alarms.map((alarm) => {
              const template = getTemplateByType(alarm.type);
              return (
                <div
                  key={alarm.id}
                  className="p-4 bg-white/70 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {template?.icon}
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {alarm.payload?.title || template?.title || 'Alarme'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {alarm.payload?.body || template?.description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(alarm.schedule).toLocaleString('pt-BR')}
                          </span>
                          {alarm.last_fire_at && (
                            <span>Último disparo: {new Date(alarm.last_fire_at).toLocaleString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Toggle ativo/inativo */}
                      <button
                        onClick={() => toggleAlarm(alarm)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          alarm.active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {alarm.active ? 'Ativo' : 'Inativo'}
                      </button>
                      
                      {/* Botão editar */}
                      <button
                        onClick={() => editAlarm(alarm)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      
                      {/* Botão deletar */}
                      <button
                        onClick={() => deleteAlarm(alarm.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Modal de criação/edição */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editingAlarm ? 'Editar Alarme' : 'Novo Alarme'}
                </h2>
                
                {/* Seleção de template (apenas para novos alarmes) */}
                {!editingAlarm && !selectedTemplate && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">Escolha um template:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {alarmTemplates.map((template) => (
                        <button
                          key={template.type}
                          onClick={() => selectTemplate(template)}
                          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {template.icon}
                            <span className="font-medium">{template.title}</span>
                          </div>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Formulário (apenas se template selecionado ou editando) */}
                {(selectedTemplate || editingAlarm) && (
                  <div className="space-y-4">
                    {/* Data e hora */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data e Hora
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.schedule ? formatDateForInput(formData.schedule) : ''}
                        onChange={(e) => setFormData({ ...formData, schedule: new Date(e.target.value).toISOString() })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    {/* Título */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título da Notificação
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Ex: Hora de medir a glicemia"
                        required
                      />
                    </div>
                    
                    {/* Corpo da mensagem */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mensagem
                      </label>
                      <textarea
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Descrição do lembrete"
                        required
                      />
                    </div>
                    
                    {/* Rota de destino */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Página de Destino
                      </label>
                      <select
                        value={formData.route}
                        onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="/dashboard">Dashboard</option>
                        <option value="/saude">Saúde</option>
                        <option value="/saude?glucose=1">Saúde - Glicemia</option>
                        <option value="/saude?pressure=1">Saúde - Pressão</option>
                        <option value="/saude?post_refeicao=1">Saúde - Pós-refeição</option>
                        <option value="/nutricao">Nutrição</option>
                        <option value="/treino">Treino</option>
                      </select>
                    </div>
                    
                    {/* Status ativo */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="text-sm font-medium text-gray-700">
                        Alarme ativo
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Botões */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  
                  {(selectedTemplate || editingAlarm) && (
                    <button
                      onClick={saveAlarm}
                      disabled={!formData.schedule || !formData.title || !formData.body}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingAlarm ? 'Salvar Alterações' : 'Criar Alarme'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}