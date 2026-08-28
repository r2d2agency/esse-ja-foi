import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, MapPin, CheckCircle2, Clock, AlertCircle, CalendarClock } from "lucide-react";
import { getVistoriaVendedorFn, confirmarPresencaVistoriaFn } from "@/lib/vistorias.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModalReagendarVistoriaVendedor } from "@/components/vendedor/ModalReagendarVistoriaVendedor";

export function CardVistoriaVendedor({ vendedorId }: { vendedorId: string }) {
  const getVistoria = useServerFn(getVistoriaVendedorFn);
  const confirmar = useServerFn(confirmarPresencaVistoriaFn);
  const [reagendarOpen, setReagendarOpen] = useState(false);

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["portal-vistoria-vendedor", vendedorId],
    queryFn: () => getVistoria({ data: { vendedorId } }),
    enabled: !!vendedorId,
  });

  const v = res?.data;

  if (isLoading || !v) return null;

  const handleConfirmar = async () => {
    const toastId = toast.loading("Confirmando presença...");
    try {
      const res = await confirmar({ data: { vistoriaId: v.id, vendedorId } });
      if (res.ok) {
        toast.success("Presença confirmada! Esperamos você.", { id: toastId });
        refetch();
      } else {
        toast.error("Erro ao confirmar presença.", { id: toastId });
      }
    } catch (err) {
      toast.error("Erro técnico.", { id: toastId });
    }
  };

  const dataHojeSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0, 10);
  const dataAtual = String(v.data_vistoria || "").slice(0, 10);
  const horarioAtual = String(v.horario_vistoria || "").slice(0, 5);
  const [hh, mm] = horarioAtual.split(":").map(Number);
  const agoraSPDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const minsSP = agoraSPDate.getHours() * 60 + agoraSPDate.getMinutes();
  const horarioAtualMin = (hh || 0) * 60 + (mm || 0);
  const podeReagendar =
    v.status === "AGUARDANDO_CONFIRMACAO" || v.status === "CONFIRMADA"
      ? dataAtual > dataHojeSP || (dataAtual === dataHojeSP && horarioAtualMin - minsSP >= 60)
      : false;

  return (
    <>
      <section className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
           <BadgeVistoria status={v.status} />
        </div>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50">
            <Calendar className="h-6 w-6 text-teal-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Sua vistoria foi agendada</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
              {v.marca} {v.modelo} • {v.placa}
            </p>
            
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                     <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Data e Horário</p>
                     <p className="text-sm font-black text-slate-900">{v.data_vistoria} às {v.horario_vistoria.substring(0, 5)}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                     <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="truncate">
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Local</p>
                     <p className="text-sm font-black text-slate-900 truncate">{v.unidade_nome}</p>
                  </div>
               </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
               <p className="text-xs text-slate-500 leading-relaxed font-medium">
                 {v.unidade_endereco}, {v.unidade_cidade}/{v.unidade_estado}
               </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {v.status === 'AGUARDANDO_CONFIRMACAO' ? (
                <>
                  <Button 
                    onClick={handleConfirmar}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-12 rounded-xl flex-1"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar presença
                  </Button>
                  {podeReagendar ? (
                    <Button
                      onClick={() => setReagendarOpen(true)}
                      variant="secondary"
                      className="h-12 rounded-xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold"
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Reagendar
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="outline"
                      className="h-12 rounded-xl border-slate-200 font-bold text-slate-400"
                      title="Só pode remarcar com no mínimo 1 hora de antecedência."
                    >
                      <AlertCircle className="mr-2 h-4 w-4" /> Não pode remarcar
                    </Button>
                  )}
                </>
              ) : v.status === 'CONFIRMADA' ? (
                 podeReagendar ? (
                    <Button
                      onClick={() => setReagendarOpen(true)}
                      className="h-12 rounded-xl border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold w-full"
                    >
                      <CalendarClock className="mr-2 h-4 w-4" /> Preciso reagendar
                    </Button>
                 ) : (
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 w-full justify-center">
                      <AlertCircle className="h-4 w-4" /> Não é possível remarcar (menos de 1h para a vistoria)
                    </div>
                 )
              ) : (
                 <Button variant="outline" className="h-12 rounded-xl border-slate-200 font-bold w-full" disabled>
                    Status: {v.status}
                 </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <ModalReagendarVistoriaVendedor
        open={reagendarOpen}
        onOpenChange={setReagendarOpen}
        vistoria={v}
        onSucesso={() => refetch()}
      />
    </>
  );
}

function BadgeVistoria({ status }: { status: string }) {
  if (status === 'CONFIRMADA') {
    return <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded">Confirmada</span>;
  }
  if (status === 'AGUARDANDO_CONFIRMACAO') {
    return <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded animate-pulse">Pendente</span>;
  }
  return <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{status}</span>;
}

