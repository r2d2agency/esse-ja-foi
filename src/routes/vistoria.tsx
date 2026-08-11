import { createFileRoute, Outlet, Link, Navigate } from "@tanstack/react-router";
import { useAuthStore } from "@/hooks/use-auth";
import { Gavel, ClipboardList, User } from "lucide-react";

export const Route = createFileRoute("/vistoria")({
  component: VistoriaMobileLayout,
  head: () => ({
    meta: [
      { title: "App do vistoriador | ESSE JÁ FOI" },
      { name: "description", content: "Agenda diária do vistoriador com as vistorias atribuídas." },
      { property: "og:title", content: "App do vistoriador | ESSE JÁ FOI" },
      { property: "og:description", content: "Vistorias do dia, endereço e início da checagem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function VistoriaMobileLayout() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-900">
            <Gavel className="h-4 w-4 text-amber-500" />
          </div>
          <span className="font-bold text-teal-900">VISTORIA</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-500">Vistoriador</p>
            <p className="text-xs font-bold text-slate-900">{user?.name || "Operador"}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-2 flex items-center justify-around">
        <Link to="/vistoria" className="flex min-h-12 flex-col items-center justify-center gap-1 px-4 text-teal-900">
          <ClipboardList className="h-6 w-6" />
          <span className="text-[11px] font-bold">Minha agenda</span>
        </Link>
        <button
          onClick={() => useAuthStore.getState().logout()}
          className="flex min-h-12 flex-col items-center justify-center gap-1 px-4 text-slate-400"
        >
          <User className="h-6 w-6" />
          <span className="text-[11px] font-medium">Sair</span>
        </button>
      </nav>
    </div>
  );
}
