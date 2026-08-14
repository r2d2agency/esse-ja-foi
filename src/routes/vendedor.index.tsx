import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Car, Plus, CheckCircle2 } from 'lucide-react';
import { listarMeusVeiculosFn } from '@/lib/vendedor.functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { AlertaAcao } from '@/components/vendedor/AlertaAcao';
import { StatusBadge, statusVeiculo } from '@/components/vendedor/StatusBadge';
import { ProgressoCadastro, montarEtapas, percentual } from '@/components/vendedor/ProgressoCadastro';
import { CardContratoVendedor } from '@/components/contratos/CardContratoVendedor';

export const Route = createFileRoute('/vendedor/')({
  component: DashboardVendedor,
});

const CAMINHO = [
  'Complete seu cadastro',
  'Cadastre seu veículo',
  'Passe pela análise',
  'Agende a vistoria',
  'Receba ofertas',
];

function DashboardVendedor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listar = useServerFn(listarMeusVeiculosFn);
  const [placaPendente, setPlacaPendente] = useState('');

  useEffect(() => {
    setPlacaPendente(sessionStorage.getItem('ejf_placa') || '');
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['meus-veiculos', user?.id],
    queryFn: () => listar({ data: { perfilId: user?.id || '' } }),
    enabled: !!user?.id,
  });

  const veiculos: any[] = (data as any)?.data || [];
  const profile = (data as any)?.profile || {};
  const etapas = montarEtapas(profile);
  const pct = percentual(etapas);
  const completo = pct === 100;
  const primeiroNome = user?.nome?.split(' ')[0] || 'vendedor';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Olá, {primeiroNome} 👋</h1>
        <p className="mt-1 text-slate-500">Acompanhe por aqui seu cadastro, veículos e negociações.</p>
      </div>

      {!completo && profile.cadastro_completo !== true && (
        <AlertaAcao
          titulo="Precisamos de você"
          descricao={profile.cadastro_completo === false && pct > 80 ? "Seu cadastro está em análise. Aguarde a validação." : "Seu cadastro ainda possui informações pendentes."}
          acaoLabel={profile.cadastro_completo === false && pct > 80 ? "Ver status" : "Resolver agora"}
          onAcao={() => navigate({ to: '/vendedor/onboarding' })}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card cadastro */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          {profile.cadastro_completo === true ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <p className="text-lg font-bold text-slate-900">Cadastro verificado</p>
            </div>
          ) : profile.cadastro_completo === false && pct > 80 ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Cadastro em análise</h2>
                <StatusBadge status="analise" />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Recebemos suas informações e estamos fazendo a validação.
              </p>
              <div className="mt-5 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px]"><CheckCircle2 className="w-3 h-3" /></div>
                    <span className="text-sm text-slate-600">Dados enviados</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-teal-100 text-teal-700 text-[10px] animate-pulse">●</div>
                    <span className="text-sm text-slate-900 font-bold">Em análise</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-300 text-[10px]">○</div>
                    <span className="text-sm text-slate-400">Cadastro aprovado</span>
                 </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Complete seu cadastro</h2>
                <StatusBadge status="incompleto" />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Precisamos validar algumas informações antes de liberar seu veículo para análise.
              </p>
              <div className="mt-5">
                <ProgressoCadastro etapas={etapas} />
              </div>
              <Button
                onClick={() => navigate({ to: '/vendedor/onboarding' })}
                className="mt-6 h-12 w-full rounded-xl bg-teal-700 font-semibold text-white transition-colors hover:bg-teal-800"
              >
                Continuar cadastro
              </Button>
            </>
          )}
        </section>

        {/* Card veículos */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          {isLoading ? (
            <p className="text-sm text-slate-400">Carregando seus veículos...</p>
          ) : veiculos.length > 0 ? (
            <>
              <h2 className="text-lg font-bold text-slate-900">Seus veículos</h2>
              <ul className="mt-4 space-y-3">
                {veiculos.slice(0, 3).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {v.marca} {v.modelo}
                      </p>
                      <p className="text-xs uppercase tracking-widest text-slate-400">{v.placa}</p>
                    </div>
                    <StatusBadge status={statusVeiculo(v.status)} />
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/vendedor/veiculos' })}
                className="mt-5 h-12 w-full rounded-xl"
              >
                Ver todos
              </Button>
            </>
          ) : placaPendente ? (
            <>
              <h2 className="text-lg font-bold text-slate-900">Seu veículo</h2>
              <p className="mt-2 text-xl font-bold uppercase tracking-[0.2em] text-slate-900">{placaPendente}</p>
              <div className="mt-3">
                <StatusBadge status="incompleto" label="Cadastro não concluído" />
              </div>
              <Button
                onClick={() => navigate({ to: '/vendedor/cadastrar' })}
                className="mt-6 h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800"
              >
                Continuar cadastro do veículo
              </Button>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
                <Car className="h-6 w-6 text-teal-700" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">Venda seu primeiro veículo</h2>
              <p className="mt-2 text-sm text-slate-500">
                Cadastre os dados básicos do seu carro para iniciar a análise.
              </p>
              <Button
                onClick={() => navigate({ to: '/vendedor/cadastrar' })}
                className="mt-6 h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800"
              >
                <Plus className="mr-2 h-4 w-4" /> Cadastrar veículo
              </Button>
            </>
          )}
        </section>
      </div>

      {user?.id && <CardContratoVendedor vendedorId={user.id} />}

      {/* Como funciona */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Como funciona</h2>
        <ol className="mt-5 grid gap-4 lg:grid-cols-5">
          {CAMINHO.map((etapa, i) => (
            <li key={etapa} className="flex items-start gap-3 lg:block lg:border-t-2 lg:border-slate-900 lg:pt-3">
              <span className="text-sm font-black text-teal-700">{i + 1}</span>
              <span className="text-sm text-slate-600 lg:mt-1 lg:block">{etapa}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
