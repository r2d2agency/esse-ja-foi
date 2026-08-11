import { Outlet, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/hooks/use-auth";

export function BackofficeLayout() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4">
        <div className="mb-8 font-bold text-teal-900 text-xl">ESSE JÁ FOI</div>
        <nav className="space-y-1">
          <a href="/admin" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded">Dashboard</a>
          <a href="/admin/leiloes" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded">Leilões</a>
          <a href="/admin/vistoria" className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded">Vistorias</a>
        </nav>
      </aside>
      
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-500">Bem-vindo, {user?.name}</div>
          <button onClick={() => useAuthStore.getState().logout()} className="text-sm text-red-600 hover:underline">Sair</button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
