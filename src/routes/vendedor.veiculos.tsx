import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Car, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { listarMeusVeiculosFn } from '@/lib/vendedor.functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusVeiculo } from '@/components/vendedor/StatusBadge';
import { montarEtapas, percentual } from '@/components/vendedor/ProgressoCadastro';

export const Route = createFileRoute('/vendedor/veiculos')({
  component: MeusVeiculos,
});

function MeusVeiculos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listar = useServerFn(listarMeusVeiculosFn);

  const { data, isLoading } = useQuery({
    queryKey: ['meus-veiculos', user?.id],
    queryFn: () => listar({ data: { perfilId: user?.id || '' } }),
    enabled: !!user?.id,
  });

  const veiculos: any[] = (data as any)?.data || [];
  const cadastroCompleto = percentual(montarEtapas((data as any)?.profile)) === 100;

  const enviarParaAnalise = () => {
    if (!cadastroCompleto) {
      toast.error('Complete seu cadastro para continuar.', {
        action: { label: 'Completar cadastro', onClick: () => navigate({ to: '/vendedor/onboarding' }) },
      });
      return;
    }
    toast.success('Veículo enviado para análise.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Meus veículos</h1>
          <p className="mt-1 text-slate-500">Acompanhe o status de cada veículo cadastrado.</p>
        </div>
        <Button
          onClick={() => navigate({ to: '/vendedor/cadastrar' })}
          className="h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800 sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Cadastrar veículo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : veiculos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Car className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-4 font-semibold text-slate-900">Nenhum veículo cadastrado</p>
          <p className="mt-1 text-sm text-slate-500">Cadastre seu carro para iniciar a análise.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {veiculos.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {v.marca} {v.modelo}
                </p>
                <p className="text-xs uppercase tracking-widest text-slate-400">{v.placa}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={statusVeiculo(v.status)} />
                <Button variant="outline" className="h-10 rounded-xl" onClick={enviarParaAnalise}>
                  Enviar para análise
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
