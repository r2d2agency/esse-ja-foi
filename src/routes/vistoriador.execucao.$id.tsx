import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, CheckCircle2, Camera, AlertTriangle, 
  MapPin, ChevronRight, ChevronLeft, ShieldCheck,
  Check, X, AlertCircle
} from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { 
  getVistoriaDetalheVistoriadorFn, 
  iniciarCheckinFn,
  salvarItemChecklistFn,
  concluirVistoriaAppFn
} from "@/lib/vistoriador.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/vistoriador/execucao/$id")({
  component: VistoriaExecucaoPage,
});

const ETAPAS = [
  "Check-in",
  "Identificação",
  "Estrutura",
  "Exterior",
  "Interior",
  "Mecânica básica",
  "Pneus e rodas",
  "Equipamentos",
  "Documentos",
  "Fotos do anúncio",
  "Revisão final"
];

function VistoriaExecucaoPage() {
  const { id: vistoriaId } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [etapaAtual, setEtapaAtual] = useState(0);
  const [placaInput, setPlacaInput] = useState("");
  const [checkinRealizado, setCheckinRealizado] = useState(false);
  const [laudoId, setLaudoId] = useState<string | null>(null);
  
  // Estados do checklist
  const [km, setKm] = useState("");
  const [observacaoGeral, setObservacaoGeral] = useState("");
  const [declaracao, setDeclaracao] = useState(false);

  const { data: res } = useSuspenseQuery({
    queryKey: ["vistoria-detalhe", vistoriaId, user?.id],
    queryFn: () => getVistoriaDetalheVistoriadorFn({ data: { vistoriaId, usuarioId: user?.id || "" } }),
  });

  const v = res?.data;

  useEffect(() => {
    if (v?.laudo_id) {
      setLaudoId(v.laudo_id);
      setCheckinRealizado(true);
      setEtapaAtual(1);
    }
  }, [v]);

  const iniciarCheckinMutation = useMutation({
    mutationFn: (data: { placa: string; localizacao: any }) => 
      iniciarCheckinFn({ data: { vistoriaId, usuarioId: user?.id || "", ...data } }),
    onSuccess: (res) => {
      if (res.ok) {
        setLaudoId(res.laudoId);
        setCheckinRealizado(true);
        setEtapaAtual(1);
        toast.success("Check-in realizado com sucesso!");
      } else {
        toast.error('message' in res ? res.message : "Erro ao realizar check-in");
      }
    }
  });

  const concluirVistoriaMutation = useMutation({
    mutationFn: () => concluirVistoriaAppFn({ 
      data: { 
        laudoId: laudoId!, 
        quilometragem: parseInt(km), 
        observacao_geral: observacaoGeral,
        declaracao 
      } 
    }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Vistoria concluída e enviada para análise!");
        navigate({ to: "/vistoriador" });
      } else {
        toast.error('message' in res ? res.message : "Erro ao concluir vistoria");
      }
    }
  });

  const handleCheckin = () => {
    if (!placaInput || placaInput.toUpperCase() !== v?.placa.toUpperCase()) {
      toast.error("A placa digitada não corresponde ao veículo agendado.");
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          iniciarCheckinMutation.mutate({
            placa: placaInput.toUpperCase(),
            localizacao: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: new Date().toISOString()
            }
          });
        },
        () => {
          iniciarCheckinMutation.mutate({
            placa: placaInput.toUpperCase(),
            localizacao: { error: "Permission denied", timestamp: new Date().toISOString() }
          });
        }
      );
    } else {
      iniciarCheckinMutation.mutate({
        placa: placaInput.toUpperCase(),
        localizacao: { error: "Not supported", timestamp: new Date().toISOString() }
      });
    }
  };

  const progress = (etapaAtual / (ETAPAS.length - 1)) * 100;

  if (!v) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:ml-64">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 border-b bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/vistoriador/vistoria/${vistoriaId}` })}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">Vistoria em execução</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{v.marca} {v.modelo} • {v.placa}</p>
          </div>
          <div className="w-10" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Etapa {etapaAtual + 1} de {ETAPAS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-slate-100" />
          <p className="mt-2 text-center text-xs font-black text-teal-700 uppercase">{ETAPAS[etapaAtual]}</p>
        </div>
      </header>

      <main className="flex-1 p-4 pb-32">
        {etapaAtual === 0 && !checkinRealizado && (
          <div className="space-y-6 pt-4">
            <div className="rounded-2xl bg-teal-50 p-6 text-center">
              <MapPin className="mx-auto h-12 w-12 text-teal-600" />
              <h2 className="mt-4 text-lg font-black text-teal-900">Iniciar Check-in</h2>
              <p className="mt-2 text-sm text-teal-700">Usamos sua localização para registrar o início da vistoria.</p>
            </div>

            <div className="space-y-4 rounded-2xl border bg-white p-6">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Confirme a placa do veículo</label>
              <Input
                placeholder="ABC-1234"
                className="h-16 text-center text-3xl font-black uppercase tracking-widest placeholder:text-slate-200"
                value={placaInput}
                onChange={(e) => setPlacaInput(e.target.value)}
              />
              <Button 
                onClick={handleCheckin}
                disabled={iniciarCheckinMutation.isPending || !placaInput}
                className="h-14 w-full bg-slate-900 text-lg font-bold"
              >
                {iniciarCheckinMutation.isPending ? "Validando..." : "Validar Placa"}
              </Button>
            </div>
          </div>
        )}

        {etapaAtual === 1 && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Dados de Identificação</h3>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Quilometragem atual (KM)</label>
                  <Input 
                    type="number"
                    placeholder="Ex: 45000"
                    className="h-14 rounded-xl text-lg font-bold"
                    value={km}
                    onChange={(e) => setKm(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-600">Foto do Painel</label>
                  <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                    <Camera className="h-8 w-8 text-slate-400" />
                    <span className="mt-2 text-xs font-bold text-slate-500">Tirar foto do painel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {etapaAtual > 1 && etapaAtual < 9 && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-5">
              <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Itens do Checklist</h3>
              
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3 border-b pb-6 last:border-0 last:pb-0">
                    <p className="font-bold text-slate-900">Item de Verificação {i}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-12 border-slate-200 text-xs font-bold uppercase">
                        Conforme
                      </Button>
                      <Button variant="outline" className="h-12 border-slate-200 text-xs font-bold uppercase">
                        Não Conforme
                      </Button>
                      <Button variant="outline" className="h-12 border-slate-200 text-xs font-bold uppercase">
                        Observação
                      </Button>
                      <Button variant="outline" className="h-12 border-slate-200 text-xs font-bold uppercase text-slate-400">
                        N/A
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {etapaAtual === 9 && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-5">
              <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Fotos do Anúncio</h3>
              <p className="text-xs font-medium text-slate-500">Siga os ângulos indicados para manter o padrão.</p>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                {["Frente 45°", "Frente", "Lateral", "Traseira", "Interior", "Motor"].map((f) => (
                  <div key={f} className="flex aspect-square flex-col items-center justify-center rounded-2xl border bg-slate-50 p-2 text-center">
                    <Camera className="h-6 w-6 text-slate-400" />
                    <span className="mt-2 text-[10px] font-bold uppercase tracking-tight text-slate-600">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {etapaAtual === 10 && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Revisão Final</h3>
              
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Observação Geral</label>
                  <Textarea 
                    placeholder="Descreva o estado geral do veículo..."
                    className="min-h-[120px] rounded-xl"
                    value={observacaoGeral}
                    onChange={(e) => setObservacaoGeral(e.target.value)}
                  />
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
                  <input 
                    type="checkbox" 
                    id="declara"
                    className="mt-1 h-5 w-5 rounded border-amber-300 accent-amber-600"
                    checked={declaracao}
                    onChange={(e) => setDeclaracao(e.target.checked)}
                  />
                  <label htmlFor="declara" className="text-xs font-bold leading-tight text-amber-900">
                    Confirmo que realizei esta vistoria e registrei as informações de acordo com o observado no veículo.
                  </label>
                </div>

                <Button 
                  onClick={() => concluirVistoriaMutation.mutate()}
                  disabled={!declaracao || concluirVistoriaMutation.isPending}
                  className="h-16 w-full bg-teal-600 text-lg font-black uppercase hover:bg-teal-700"
                >
                  {concluirVistoriaMutation.isPending ? "Concluindo..." : "Concluir Vistoria"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Navegação de Etapas */}
      {checkinRealizado && etapaAtual < 10 && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-4 lg:left-64">
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="h-14 flex-1 rounded-xl font-bold border-slate-200"
              onClick={() => setEtapaAtual(Math.max(1, etapaAtual - 1))}
              disabled={etapaAtual <= 1}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>
            <Button 
              className="h-14 flex-2 rounded-xl bg-slate-900 font-bold"
              onClick={() => setEtapaAtual(etapaAtual + 1)}
            >
              Continuar
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
