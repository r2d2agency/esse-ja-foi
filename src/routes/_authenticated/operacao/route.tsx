import { createFileRoute } from '@tanstack/react-router';
import { BackofficeLayout } from '@/components/layout/BackofficeLayout';

export const Route = createFileRoute('/_authenticated/operacao')({
  component: OperacaoDashboard,
});

function OperacaoDashboard() {
  return (
    <BackofficeLayout role="operacao">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel Operacional</h1>
          <p className="text-gray-500 mt-1">Gestão de leads, veículos e fluxo de vendas.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-400">Área de trabalho operacional em construção.</p>
        </div>
      </div>
    </BackofficeLayout>
  );
}
