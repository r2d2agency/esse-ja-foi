import { createFileRoute } from '@tanstack/react-router';
import { BackofficeLayout } from '@/components/layout/BackofficeLayout';

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <BackofficeLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Admin</h1>
          <p className="text-gray-500 mt-1">Visão geral do sistema e métricas críticas.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Leads Hoje', value: '12', trend: '+15%' },
            { label: 'Vistorias Agendadas', value: '8', trend: 'Estável' },
            { label: 'Leilões Ativos', value: '45', trend: '+2' },
            { label: 'Vendas Mês', value: '128', trend: '+8%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">{stat.label}</p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-3xl font-bold text-teal-900">{stat.value}</p>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  stat.trend.startsWith('+') ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                }`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BackofficeLayout>
  );
}
