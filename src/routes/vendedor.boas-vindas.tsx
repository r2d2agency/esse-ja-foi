import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { listarMeusVeiculosFn } from '@/lib/vendedor.functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ProgressoCadastro, montarEtapas } from '@/components/vendedor/ProgressoCadastro';

export const Route = createFileRoute('/vendedor/boas-vindas')({
  component: BoasVindas,
});

function BoasVindas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listar = useServerFn(listarMeusVeiculosFn);

  const { data } = useQuery({
    queryKey: ['meus-veiculos', user?.id],
    queryFn: () => listar({ data: { perfilId: user?.id || '' } }),
    enabled: !!user?.id,
  });

  const etapas = montarEtapas((data as any)?.profile);
  const primeiroNome = user?.nome?.split(' ')[0] || 'vendedor';

  return (
    <div className="animate-in fade-in duration-500 mx-auto max-w-xl py-6">
      <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900">
        Olá, {primeiroNome}. Seu cadastro foi iniciado.
      </h1>
      <p className="mt-3 text-slate-500">
        Agora precisamos de algumas informações para validar sua identidade e permitir que seus veículos avancem
        para análise.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <ProgressoCadastro etapas={etapas} />
      </div>

      <div className="mt-8 space-y-3">
        <Button
          onClick={() => navigate({ to: '/vendedor/onboarding' })}
          className="h-14 w-full rounded-xl bg-teal-700 text-base font-bold text-white transition-colors hover:bg-teal-800"
        >
          Continuar meu cadastro
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/vendedor' })}
          className="h-12 w-full rounded-xl text-slate-500"
        >
          Fazer depois
        </Button>
      </div>
    </div>
  );
}
