import { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Calendar, Clock, CalendarClock, ChevronLeft, ChevronRight, X, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUnidadesDisponiveisFn, getSlotsUnidadeDisponiveisFn, remarcarAgendamentoVistoriaFn } from "@/lib/vistorias.functions";
import { cn } from "@/lib/utils";

export function normalizarIdStr(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const apenasUuid = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (apenasUuid?.[0]) return apenasUuid[0].toLowerCase();
  return raw.toLowerCase();
}

export function idsIguais(a: unknown, b: unknown): boolean {
  const x = normalizarIdStr(a);
  const y = normalizarIdStr(b);
  return !!x && !!y && x === y;
}

function criarHorarioAtendimentoFormVazio(): Record<string, Array<{ inicio: string; fim: string }>> {
  return {
    "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "0": [],
  };
}

export { criarHorarioAtendimentoFormVazio as criarHorarioAtendimentoForm };
export { resumirHorario as resumirHorarioAtendimentoUnidade };

const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function gerar7Dias(offsetSemanas: number) {
  const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() + offsetSemanas * 7);
  const dias: Array<{ iso: string; diaSemana: string; diaMes: number; mes: number; passado: boolean }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const hojeIso = hoje.toISOString().slice(0, 10);
    dias.push({
      iso,
      diaSemana: DIAS[d.getDay()],
      diaMes: d.getDate(),
      mes: d.getMonth() + 1,
      passado: iso < hojeIso,
    });
  }
  return dias;
}

const DIAS_ATENDIMENTO: Record<string, string> = {
  "1": "Seg", "2": "Ter", "3": "Qua", "4": "Qui", "5": "Sex", "6": "Sáb", "0": "Dom",
};

function resumoHorario(horarioAtendimento: any) {
  try {
    const parsed = typeof horarioAtendimento === "string" ? JSON.parse(horarioAtendimento) : horarioAtendimento;
    if (!parsed || typeof parsed !== "object") return "Sem horários cadastrados.";
    const dias = Object.keys(parsed).sort();
    if (dias.length === 0) return "Sem horários cadastrados.";
    const linhas: string[] = [];
    for (const d of dias) {
      const arr = (parsed as any)[d];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const label = DIAS_ATENDIMENTO[d] || d;
      const periodos = arr.map((p: any) => `${p.inicio}-${p.fim}`).join(", ");
      linhas.push(`${label} ${periodos}`);
    }
    return linhas.join(" | ") || "Sem horários cadastrados.";
  } catch {
    return "Horário inválido.";
  }
}

export function ModalReagendarVistoriaVendedor(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vistoria: any;
  onSucesso?: () => void;
}) {
  const { open, onOpenChange, vistoria, onSucesso } = props;
  const { user } = useAuth();

  const [unidadeId, setUnidadeId] = useState("");
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [dataVistoria, setDataVistoria] = useState("");
  const [horarioVistoria, setHorarioVistoria] = useState("");

  const listarUnidades = useServerFn(getUnidadesDisponiveisFn);
  const getSlots = useServerFn(getSlotsUnidadeDisponiveisFn);
  const remarcar = useServerFn(remarcarAgendamentoVistoriaFn);

  const cidadesRef = useMemo(() => {
    const cidade = String(vistoria?.unidade_cidade || vistoria?.cidade || "");
    return cidade ? { cidade } : undefined;
  }, [vistoria]);

  const unidadesRes = useQuery({
    queryKey: ["vendedor-reagendar-unidades", cidadesRef?.cidade || ""],
    queryFn: () => listarUnidades({ data: cidadesRef || {} }),
    enabled: open,
  });
  const unidades = ((unidadesRes.data as any)?.data || []) as any[];

  const unidadeSelecionada = unidades.find((u) => idsIguais(u.id, unidadeId)) || null;

  const diasSemanaAtual = useMemo(() => gerar7Dias(semanaOffset), [semanaOffset, open]);

  const resumoHorarioUnidade = unidadeSelecionada ? resumoHorario(unidadeSelecionada.horario_atendimento) : "";
  const horarioVazio = !!unidadeSelecionada && resumoHorarioUnidade === "Sem horários cadastrados.";

  const slotsQuery = useQuery({
    queryKey: [
      "vendedor-reagendar-slots",
      normalizarIdStr(unidadeId),
      dataVistoria,
      unidadeSelecionada?.nome,
      unidadeSelecionada?.cidade,
    ],
    queryFn: () =>
      getSlots({
        data: {
          unidadeId: normalizarIdStr(unidadeId),
          data: dataVistoria,
          vistoriadorId: null,
          nomeUnidade: unidadeSelecionada?.nome || null,
          cidadeUnidade: unidadeSelecionada?.cidade || null,
        },
      }),
    enabled: open && !!normalizarIdStr(unidadeId) && !!dataVistoria,
  });
  const slotsDisponiveis = (slotsQuery.data as any)?.slots || [];
  const slotsMensagem = (slotsQuery.data as any)?.message || "";
  const slotsCarregando = slotsQuery.isLoading;
  const unidadesCarregando = unidadesRes.isLoading;

  useEffect(() => {
    if (!open) return;
    if (vistoria?.unidade_id) setUnidadeId(normalizarIdStr(vistoria.unidade_id));
    const data = String(vistoria?.data_vistoria || "").slice(0, 10);
    if (data) setDataVistoria(data);
    const hora = String(vistoria?.horario_vistoria || "").slice(0, 5);
    if (hora) setHorarioVistoria(hora);
    setSemanaOffset(0);
  }, [open, vistoria]);

  useEffect(() => {
    if (!open) return;
    if (unidades.length === 0) return;
    if (unidadeId && unidades.some((u) => idsIguais(u.id, unidadeId))) return;
    setUnidadeId(normalizarIdStr(unidades[0].id));
  }, [open, unidades, unidadeId]);

  useEffect(() => {
    if (!open) return;
    if (!dataVistoria) {
      const primeiro = diasSemanaAtual.find((d) => !d.passado);
      if (primeiro) setDataVistoria(primeiro.iso);
      return;
    }
    const dentro = diasSemanaAtual.some((d) => d.iso === dataVistoria);
    if (!dentro) {
      const primeiro = diasSemanaAtual.find((d) => !d.passado);
      if (primeiro) setDataVistoria(primeiro.iso);
    }
  }, [open, diasSemanaAtual, dataVistoria]);

  useEffect(() => {
    setHorarioVistoria("");
  }, [unidadeId, dataVistoria]);

  useEffect(() => {
    if (!slotsDisponiveis.length) return;
    if (slotsDisponiveis.some((s: any) => s.value === horarioVistoria)) return;
    if (slotsDisponiveis.length === 1) setHorarioVistoria(slotsDisponiveis[0].value);
  }, [slotsDisponiveis, horarioVistoria]);

  const hojeSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const validarFront = () => {
    if (!unidadeSelecionada || !dataVistoria || !horarioVistoria) {
      toast.error("Selecione unidade, data e horário para remarcar.");
      return false;
    }
    const hojeSP_iso = hojeSP.toISOString().slice(0, 10);
    if (dataVistoria < hojeSP_iso) {
      toast.error("A data selecionada está no passado.");
      return false;
    }
    if (dataVistoria === hojeSP_iso) {
      const [hh, mm] = String(horarioVistoria || ":").split(":").map(Number);
      const minSP = hojeSP.getHours() * 60 + hojeSP.getMinutes();
      const horarioSel = (hh || 0) * 60 + (mm || 0);
      if (horarioSel <= minSP) {
        toast.error("O horário selecionado já passou. Escolha outro horário ou data.");
        return false;
      }
    }
    return true;
  };

  const handleRemarcar = async () => {
    if (!validarFront()) return;
    if (!user?.id) {
      toast.error("Você precisa estar logado para remarcar.");
      return;
    }
    const toastId = toast.loading("Remarcando a vistoria...");
    try {
      const res = await remarcar({
        data: {
          vistoriaId: normalizarIdStr(vistoria.id),
          novaUnidadeId: normalizarIdStr(unidadeSelecionada!.id),
          novaData: dataVistoria,
          novoHorario: horarioVistoria,
          vendedorId: normalizarIdStr(user.id),
          permissaoAdmin: false,
          unidade_nome: String(unidadeSelecionada?.nome || "").trim() || null,
          unidade_cidade: String(unidadeSelecionada?.cidade || "").trim() || null,
        },
      });
      if (!res?.ok) {
        toast.error(res?.message || "Não foi possível remarcar a vistoria.", { id: toastId });
        return;
      }
      toast.success("Vistoria remarcada com sucesso!", { id: toastId });
      onOpenChange(false);
      onSucesso?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro técnico ao remarcar a vistoria.", { id: toastId });
    }
  };

  if (!vistoria) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-teal-700" />
            Reagendar vistoria
          </DialogTitle>
          <DialogDescription className="text-left">
            Atual: {String(vistoria.data_vistoria || "").slice(0, 10)} às {String(vistoria.horario_vistoria || "").slice(0, 5)} na {String(vistoria.unidade_nome || "")}.
            Escolha nova unidade, data e horário. É permitido remarcar com no mínimo 1 hora de antecedência.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-black">Veículo</p>
            <p className="font-black text-slate-900 mt-1 text-lg">{vistoria.marca} {vistoria.modelo}</p>
            <p className="text-xs font-mono text-slate-500 uppercase">{vistoria.placa}</p>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              Unidade de vistoria credenciada
            </label>
            <p className="text-xs text-slate-500 mt-1 mb-2">
              Escolha qualquer unidade cadastrada.
            </p>
            {unidadesCarregando ? (
              <p className="text-sm text-slate-400 p-3 border border-slate-200 rounded-lg bg-white">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Carregando unidades...
              </p>
            ) : unidades.length === 0 ? (
              <p className="text-sm text-amber-700 p-3 border border-amber-200 rounded-lg bg-amber-50">
                Nenhuma unidade disponível no momento.
              </p>
            ) : (
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
                className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              >
                {unidades.map((u) => (
                  <option key={String(u.id)} value={normalizarIdStr(u.id)}>
                    {u.nome} — {u.cidade}/{u.estado}
                  </option>
                ))}
              </select>
            )}
          </div>

          {unidadeSelecionada && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">{unidadeSelecionada.nome}</p>
                  <p className="text-xs text-slate-500">
                    {unidadeSelecionada.endereco || ""} — {unidadeSelecionada.cidade}/{unidadeSelecionada.estado}
                  </p>
                </div>
                <Badge className={cn(
                  "text-[10px] font-black uppercase tracking-wider",
                  horarioVazio
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                )}>
                  {horarioVazio ? "Sem horários" : "CONFIGURADA"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">DURAÇÃO</p>
                  <p className="text-sm font-bold text-slate-900">{unidadeSelecionada.duracao_padrao_minutos || 60} min / vistoria</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">JANELA</p>
                  <p className="text-sm font-bold text-slate-900">{unidadeSelecionada.intervalo_entre_vistorias_minutos || 0} min entre</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RESPONSÁVEL</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{unidadeSelecionada.responsavel || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">HORÁRIOS DE ATENDIMENTO</p>
                <p className="text-sm font-semibold text-slate-700 mt-1 leading-relaxed">{resumoHorarioUnidade}</p>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSemanaOffset(Math.max(0, semanaOffset - 1))}
                  disabled={semanaOffset === 0}
                  className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {semanaOffset === 0 ? "Semana atual" : `+${semanaOffset} semana(s)`}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {diasSemanaAtual[0]?.diaSemana} {diasSemanaAtual[0]?.diaMes}/{String(diasSemanaAtual[0]?.mes).padStart(2, "0")} .. {diasSemanaAtual[6]?.diaSemana} {diasSemanaAtual[6]?.diaMes}/{String(diasSemanaAtual[6]?.mes).padStart(2, "0")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSemanaOffset(semanaOffset + 1)}
                  className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <input
                type="date"
                value={dataVistoria}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDataVistoria(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-7 gap-2">
              {diasSemanaAtual.map((d) => {
                const selecionado = dataVistoria === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={d.passado}
                    onClick={() => setDataVistoria(d.iso)}
                    className={cn(
                      "relative rounded-xl border py-3 px-2 text-center transition-colors",
                      d.passado
                        ? "opacity-40 bg-slate-50 border-slate-100 cursor-not-allowed"
                        : selecionado
                        ? "border-teal-600 bg-teal-50 ring-2 ring-teal-200"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <p className={cn("text-[10px] font-black uppercase tracking-widest",
                      selecionado ? "text-teal-700" : "text-slate-400")}>
                      {d.diaSemana}
                    </p>
                    <p className={cn("text-xl font-black mt-1",
                      selecionado ? "text-teal-700" : "text-slate-900")}>
                      {d.diaMes}
                    </p>
                    <p className="text-[10px] text-slate-400">/{String(d.mes).padStart(2, "0")}</p>
                    {!d.passado && unidadeSelecionada && (
                      <Badge className="mt-1 bg-slate-100 text-slate-700 text-[9px] px-1 py-0">
                        8
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Slots disponíveis</p>
                <p className="text-xs text-slate-500 mt-1">Escolha um horário para agendar.</p>
              </div>
              {unidadeSelecionada && !horarioVazio && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold">{resumoHorarioUnidade.split(" | ")[0]}</p>
                  <p className="text-[10px] text-slate-400 font-black">
                    {unidadeSelecionada.duracao_padrao_minutos || 60}min + {unidadeSelecionada.intervalo_entre_vistorias_minutos || 0}min de janela
                  </p>
                </div>
              )}
            </div>

            {slotsCarregando && (
              <p className="text-sm text-slate-400 p-3 border border-slate-200 rounded-lg bg-white">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Buscando horários disponíveis...
              </p>
            )}

            {!slotsCarregando && slotsMensagem && slotsDisponiveis.length === 0 && (
              <div className="border-dashed border border-amber-300 bg-amber-50 rounded-xl p-4 text-amber-900 text-sm font-semibold">
                {slotsMensagem}
              </div>
            )}

            {!slotsCarregando && !slotsMensagem && slotsDisponiveis.length === 0 && (
              <div className="border-dashed border border-slate-300 bg-slate-50 rounded-xl p-4 text-slate-600 text-sm font-semibold">
                Nenhum horário disponível para este dia. Escolha outra unidade ou data.
              </div>
            )}

            {slotsDisponiveis.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slotsDisponiveis.map((slot: any) => {
                  const selecionado = horarioVistoria === slot.value;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => setHorarioVistoria(slot.value)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-all",
                        selecionado
                          ? "border-teal-600 bg-teal-50 ring-2 ring-teal-200"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <p className={cn("text-base font-black", selecionado ? "text-teal-700" : "text-slate-900")}>
                        {slot.value}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">até {slot.fim}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button
              onClick={handleRemarcar}
              disabled={!unidadeSelecionada || !dataVistoria || !horarioVistoria || slotsCarregando}
              className="bg-teal-700 hover:bg-teal-800 text-white font-black"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar remarcação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { criarHorarioAtendimentoForm };
