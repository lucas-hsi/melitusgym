import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FoodAutocomplete from '@/components/FoodAutocomplete';
import tacoService from '@/lib/tacoService';

jest.mock('@/lib/tacoService');

describe('FoodAutocomplete', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('exibe resultados locais com badge Local', async () => {
    (tacoService.searchTacoFoods as jest.Mock).mockResolvedValue({
      term: 'arroz',
      sources: ['taco_local'],
      items: [
        {
          id: 'taco_local_arroz_cozido',
          source: 'taco_local',
          name: 'Arroz branco, cozido',
          category: 'Cereais e derivados',
          nutrients_per_100g: { energy_kcal: 128, carbohydrates: 28.1 },
        },
      ],
      total_found: 1,
    });

    render(<FoodAutocomplete onSelect={onSelect} />);
    const input = screen.getByLabelText('Buscar alimento');
    fireEvent.change(input, { target: { value: 'arroz' } });

    await waitFor(() => {
      expect(screen.getByText('Arroz branco, cozido')).toBeInTheDocument();
    });

    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('faz fallback para TBCA online com badge Online', async () => {
    (tacoService.searchTacoFoods as jest.Mock).mockResolvedValue({
      term: 'banana',
      sources: ['taco_local'],
      items: [],
      total_found: 0,
    });
    (tacoService.searchTacoOnline as jest.Mock).mockResolvedValue({
      query: 'banana',
      items: [
        {
          nome: 'Banana prata',
          categoria: 'Frutas',
          kcal: 89,
          carb: 22.8,
          prot: 1.1,
          lip: 0.3,
          fibra: 2.6,
          porcao: '1 unidade média',
          porcao_gr: 80,
        },
      ],
      count: 1,
      total_found: 1,
      source: 'tbca_online',
      cached: false,
      search_time_ms: 10,
      timestamp: new Date().toISOString(),
    });
    (tacoService.convertTacoOnlineToTacoFood as jest.Mock).mockImplementation((item: any) => ({
      id: 'taco_online_banana_prata',
      source: 'tbca_online',
      name: item.nome,
      category: item.categoria,
      nutrients_per_100g: { energy_kcal: item.kcal, carbohydrates: item.carb },
    }));

    render(<FoodAutocomplete onSelect={onSelect} />);
    const input = screen.getByLabelText('Buscar alimento');
    fireEvent.change(input, { target: { value: 'banana' } });

    await waitFor(() => {
      expect(screen.getByText('Banana prata')).toBeInTheDocument();
    });
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('exibe mensagem not_found quando não há resultados', async () => {
    (tacoService.searchTacoFoods as jest.Mock).mockResolvedValue({
      term: 'zzzz',
      sources: ['taco_local'],
      items: [],
      total_found: 0,
    });
    (tacoService.searchTacoOnline as jest.Mock).mockResolvedValue({
      query: 'zzzz',
      items: [],
      count: 0,
      total_found: 0,
      source: 'tbca_online',
      cached: false,
      search_time_ms: 8,
      timestamp: new Date().toISOString(),
    });

    render(<FoodAutocomplete onSelect={onSelect} />);
    const input = screen.getByLabelText('Buscar alimento');
    fireEvent.change(input, { target: { value: 'zzzz' } });

    await waitFor(() => {
      expect(screen.getByText('Nenhum alimento encontrado')).toBeInTheDocument();
    });
    expect(screen.getByText('source: not_found')).toBeInTheDocument();
  });
});