import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Car, Plus } from 'lucide-react';
import { listarMeusVeiculosFn } from '@/lib/vendedor.functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { CardVeiculo } from '@/components/veiculo/CardVeiculo';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/vendedor/veiculos')({
  component: MeusVeiculos,
});

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'rascunhos', label: 'Rascunhos' },
  { id: 'analise', label: 'Em análise' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'vendidos', label: 'Vendidos' },
] as const;

function filtrar(veiculos: any[], filtro: string) {
  switch (filtro) {
    case 'rascunhos': return veiculos.filter((v) => v.status === 'RASCUNHO');
    case 'analise': return veiculos.filter((v) => v.status === 'AGUARDANDO_APROVACAO');
    case 'andamento': return veiculos.filter((v) => ['CADASTRADO', 'AGENDADO', 'EM_VISTORIA', 'EM_LEILAO'].includes(v.status));
    case 'vendidos': return veiculos.filter((v) => v.status === 'VENDIDO');
    default: return veiculos;
  }
}

function MeusVeiculos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listar = useServerFn(listarMeusVeiculosFn);
  const [filtro, setFiltro] = useState<string>('todos');

  const { data, isLoading } = useQuery({
    queryKey: ['meus-veiculos', user?.id],
    queryFn: () => listar({ data: { perfilId: user?.id || '' } }),
    enabled: !!user?.id,
  });

  const veiculos: any[] = (data as any)?.data || [];
  const lista = filtrar(veiculos, filtro);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Meus veículos</h1>
          <p className="mt-1 text-slate-500">Acompanhe o status de cada veículo cadastrado.</p>
        </div>
        <Button
          onClick={() => navigate({ to: '/vendedor/cadastrar', search: { id: undefined } })}
          className="h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Cadastrar veículo
        </Button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              filtro === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Car className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-4 font-semibold text-slate-900">Nenhum veículo por aqui</p>
          <p className="mt-1 text-sm text-slate-500">Cadastre seu carro para iniciar a análise.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((v) => (
            <CardVeiculo 
              key={v.id} 
              veiculo={v} 
              onAbrir={() => { navigate({ to: '/vendedor/veiculo/$id', params: { id: v.id } }); }}
              onEditar={v.status === 'RASCUNHO' || v.status === 'CADASTRO_INCOMPLETO' ? () => { navigate({ to: '/vendedor/cadastrar', search: { id: v.id } }); } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
