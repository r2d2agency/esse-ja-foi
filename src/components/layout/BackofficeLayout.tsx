import { Link, Outlet, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/hooks/use-auth";
import { ReactNode } from "react";

interface BackofficeLayoutProps {
  children?: ReactNode;
}

export function BackofficeLayout({ children }: BackofficeLayoutProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="mb-8 font-bold text-teal-900 text-xl">ESSE JÁ FOI</div>
        <nav className="space-y-1">
          <Link to="/admin" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Dashboard</Link>
          <Link to="/operacao/leads" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Leads</Link>
          <Link to="/operacao/clientes" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Clientes</Link>
          <Link to="/operacao/veiculos" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Veículos</Link>
          <Link to="/operacao/agenda" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Agenda</Link>
          <Link to="/operacao/laudos" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Laudos</Link>
          <Link to="/admin/checklist" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Checklist</Link>
          <Link to="/operacao/bi" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Dashboard BI</Link>

          <Link to="/comprador" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Leilões</Link>
          <Link to="/vistoria" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded [&.active]:bg-teal-50 [&.active]:text-teal-900">Vistorias</Link>
        </nav>
      </aside>
      
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">Bem-vindo, {user?.name}</div>
          <button onClick={() => useAuthStore.getState().logout()} className="text-sm text-red-600 hover:underline">Sair</button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
