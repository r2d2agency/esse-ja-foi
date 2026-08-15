import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, Clock, MapPin, ChevronRight, AlertCircle, LogOut } from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { getVistoriasHojeVistoriadorFn } from "@/lib/vistoriador.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vistoriador/")({
  component: VistoriasHojePage,
});


function VistoriasHojePage() {
  const { user, logout } = useAuthStore();
  
  const { data: vistoriasRes } = useSuspenseQuery({
    queryKey: ["vistorias-hoje", user?.id],
    queryFn: () => getVistoriasHojeVistoriadorFn({ data: { usuarioId: user?.id || "" } }),
  });

  const vistorias = vistoriasRes?.ok ? vistoriasRes.data : [];
  const hoje = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="p-4 lg:ml-64 lg:p-10">
      <header className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Vistorias de hoje</h1>
          <p className="text-slate-500 capitalize">{hoje}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-400 hover:text-red-600">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>


      {vistorias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Calendar className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Nenhuma vistoria para hoje</h2>
          <p className="mt-1 text-slate-500">Aproveite para organizar sua agenda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vistorias.map((vistoria: any, index: number) => (
            <div
              key={vistoria.id}
              className={`relative overflow-hidden rounded-2xl border bg-white p-5 transition-all active:scale-[0.98] ${
                index === 0 ? "border-teal-200 ring-2 ring-teal-500/10" : ""
              }`}
            >
              {index === 0 && (
                <div className="absolute right-0 top-0 rounded-bl-xl bg-teal-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  Próxima
                </div>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-teal-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg font-black tracking-tight">
                    {vistoria.horario_vistoria.substring(0, 5)}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    vistoria.status === "CONFIRMADA"
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-600"
                  }
                >
                  {vistoria.status}
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Car className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold leading-tight text-slate-900">
                    {vistoria.marca} {vistoria.modelo}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {vistoria.placa}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{vistoria.vendedor_nome}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{vistoria.unidade_nome}</span>
                </div>
              </div>

              <Button
                asChild
                className="mt-5 w-full h-12 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                <Link to="/vistoriador/vistoria/$id" params={{ id: vistoria.id }}>
                  Ver vistoria
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" x2="16" y1="2" y2="6"/>
      <line x1="8" x2="8" y1="2" y2="6"/>
      <line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  );
}

function User({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
