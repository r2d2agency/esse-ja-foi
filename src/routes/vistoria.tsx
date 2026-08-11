import { createFileRoute } from "@tanstack/react-router";
import { useAuthStore } from "@/hooks/use-auth";
import { Gavel, Camera, History, User } from "lucide-react";

export const Route = createFileRoute("/vistoria")({
  component: VistoriaMobileLayout,
});

function VistoriaMobileLayout() {
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Mobile Header */}
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

      {/* Content Area */}
      <main className="flex-1 p-4 pb-20">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Agendamentos Hoje</h2>
          
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">14:30</span>
                  <span className="inline-block px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">ABC-1234</span>
                </div>
                <h3 className="font-bold text-slate-900">Toyota Corolla XEI</h3>
                <p className="text-xs text-slate-500 mt-1">Rua das Flores, 123 - Centro</p>
                <button className="mt-4 w-full py-4 bg-teal-900 text-white rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <Camera className="h-6 w-6" /> INICIAR VISTORIA
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-2 flex items-center justify-between pb-safe">
        <button className="flex flex-col items-center gap-1 text-teal-900">
          <Gavel className="h-5 w-5" />
          <span className="text-[10px] font-bold">Início</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <History className="h-5 w-5" />
          <span className="text-[10px] font-medium">Histórico</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </nav>
    </div>
  );
}
