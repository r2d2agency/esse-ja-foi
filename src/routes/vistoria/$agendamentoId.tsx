import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/hooks/use-auth";
import {
  criarLaudoFn,
  detalheAgendamentoFn,
  registrarDivergenciaFn,
  validarPlacaFn,
} from "@/lib/laudos.functions";
import { maskPlaca } from "@/lib/brasil";
import { ArrowLeft, Copy, MapPin, Phone, ShieldAlert, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/vistoria/$agendamentoId")({
  component: DetalheVistoria,
});

type Row = Record<string, any>;

function abrirRota(lat: number, lng: number, rotulo: string) {
  const ua = navigator.userAgent || "";
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const esquema = /iPad|iPhone|iPod/.test(ua)
    ? `maps://?daddr=${lat},${lng}`
    : `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(rotulo)})`;
  const inicio = Date.now();
  window.location.href = esquema;
  setTimeout(() => {
    if (Date.now() - inicio < 2000) window.open(web, "_blank");
  }, 1200);
}

function DetalheVistoria() {
  const { agendamentoId } = Route.useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [item, setItem] = useState<Row | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [etapa, setEtapa] = useState<"detalhe" | "placa" | "inicio">("detalhe");
  const [placa, setPlaca] = useState("");
  const [divergente, setDivergente] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!user?.id) return;
      const res = await detalheAgendamentoFn({ data: { id: agendamentoId, vistoriadorId: user.id } });
      if (!res.ok) {
        toast.error(res.message);
        setCarregando(false);
        return;
      }
      setItem(res.data as Row);
      setCarregando(false);
    })();
  }, [agendamentoId, user?.id]);

  if (carregando) return <p className="text-sm text-slate-500">Carregando...</p>;
  if (!item) return <p className="text-sm text-slate-500">Vistoria não encontrada.</p>;

  const endereco = [item['endereco'], item['veiculo_cidade'], item['uf'], item['cep']].filter(Boolean).join(", ");
  const telefone = String(item['cliente_whatsapp'] ?? item['cliente_telefone'] ?? "").replace(/\D/g, "");
  const lat = Number(item['latitude'] ?? 0);
  const lng = Number(item['longitude'] ?? 0);

  const conferirPlaca = async () => {
    setEnviando(true);
    const res = await validarPlacaFn({ data: { agendamentoId, placa, vistoriadorId: user?.id ?? null } });
    setEnviando(false);
    if ("erro" in res && res.erro) {
      toast.error(res.message);
      return;
    }
    if (!res.confere) {
      setDivergente(true);
      toast.error("A placa não confere com o agendamento.");
      return;
    }
    setDivergente(false);
    setEtapa("inicio");
  };

  const reportarDivergencia = async () => {
    if (!user?.id) return;
    const res = await registrarDivergenciaFn({ data: { agendamentoId, placaInformada: placa, vistoriadorId: user.id } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Divergência reportada para a equipe.");
  };

  const iniciarVistoria = async () => {
    if (!user?.id) return;
    setEnviando(true);
    const res = await criarLaudoFn({ data: { agendamentoId, vistoriadorId: user.id, placaConfirmada: placa } });
    setEnviando(false);
    if (!res.ok || !res.data) {
      toast.error(res.message);
      return;
    }
    void navigate({ to: "/vistoria/laudo/$laudoId", params: { laudoId: String((res.data as Row)['id']) } });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => (etapa === "detalhe" ? void navigate({ to: "/vistoria" }) : setEtapa("detalhe"))}
        className="flex min-h-12 items-center gap-2 text-base font-semibold text-slate-700"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </button>

      {etapa === "detalhe" && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Veículo</p>
            <h1 className="text-xl font-bold text-slate-900">
              {item['marca']} {item['modelo']} {item['ano_modelo'] ?? ""}
            </h1>
            <p className="text-lg font-bold tracking-wider text-teal-900">{item['placa']}</p>
            <p className="mt-2 text-sm text-slate-600">Cliente: {item['cliente_nome'] ?? "—"}</p>
            <p className="text-sm text-slate-600">
              Horário:{" "}
              {new Date(String(item['data_hora'])).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            {item['observacao'] && (
              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{item['observacao']}</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Local</p>
            <p className="text-base text-slate-800">{endereco || "Endereço não informado"}</p>
            <div className="mt-3 grid gap-3">
              <button
                disabled={!lat || !lng}
                onClick={() => abrirRota(lat, lng, String(item['placa'] ?? "Vistoria"))}
                className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-teal-900 text-lg font-bold text-white disabled:opacity-40"
              >
                <MapPin className="h-6 w-6" /> Traçar rota
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(endereco);
                  toast.success("Endereço copiado.");
                }}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 text-base font-semibold text-slate-700"
              >
                <Copy className="h-5 w-5" /> Copiar endereço
              </button>
              <a
                href={telefone ? `tel:+55${telefone}` : undefined}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 text-base font-semibold text-slate-700 ${
                  telefone ? "" : "pointer-events-none opacity-40"
                }`}
              >
                <Phone className="h-5 w-5" /> Ligar para o cliente
              </a>
            </div>
          </div>

          <button
            onClick={() => setEtapa("placa")}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-lg font-bold text-slate-900"
          >
            <ClipboardCheck className="h-6 w-6" /> Confirmar placa
          </button>
        </>
      )}

      {etapa === "placa" && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xl font-bold text-slate-900">Confirme a placa</h2>
          <p className="text-sm text-slate-600">Digite a placa do veículo que está na sua frente.</p>
          <input
            value={placa}
            onChange={(e) => setPlaca(maskPlaca(e.target.value))}
            placeholder="ABC1D23"
            inputMode="text"
            autoCapitalize="characters"
            className="w-full rounded-xl border-2 border-slate-300 p-4 text-center text-2xl font-bold tracking-[0.3em] uppercase"
          />
          <button
            disabled={placa.replace(/\W/g, "").length < 7 || enviando}
            onClick={() => void conferirPlaca()}
            className="min-h-14 w-full rounded-xl bg-teal-900 text-lg font-bold text-white disabled:opacity-40"
          >
            {enviando ? "Verificando..." : "Validar placa"}
          </button>

          {divergente && (
            <div className="space-y-3 rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 font-bold text-red-700">
                <ShieldAlert className="h-5 w-5" /> Placa divergente
              </p>
              <p className="text-sm text-red-700">
                A placa do agendamento é <strong>{item['placa']}</strong>. Não é possível avançar.
              </p>
              <button
                onClick={() => void reportarDivergencia()}
                className="min-h-12 w-full rounded-xl bg-red-600 text-base font-bold text-white"
              >
                Reportar divergência
              </button>
            </div>
          )}
        </div>
      )}

      {etapa === "inicio" && (
        <ResumoInicio agendamentoId={agendamentoId} onIniciar={() => void iniciarVistoria()} enviando={enviando} />
      )}
    </div>
  );
}

function ResumoInicio({
  agendamentoId,
  onIniciar,
  enviando,
}: {
  agendamentoId: string;
  onIniciar: () => void;
  enviando: boolean;
}) {
  const [categorias, setCategorias] = useState<Array<{ categoria: string; total: number }>>([]);

  useEffect(() => {
    void (async () => {
      const { listarModelosFn } = await import("@/lib/checklist.functions");
      const { obterModeloFn } = await import("@/lib/checklist.functions");
      const lista = await listarModelosFn();
      const ativo = (lista.data ?? []).find((m) => m['ativo'] === true);
      if (!ativo) return;
      const res = await obterModeloFn({ data: { id: String(ativo['id']) } });
      const itens = res.data?.itens ?? [];
      const mapa = new Map<string, number>();
      for (const item of itens) {
        const c = String(item['categoria']);
        mapa.set(c, (mapa.get(c) ?? 0) + 1);
      }
      setCategorias(Array.from(mapa.entries()).map(([categoria, total]) => ({ categoria, total })));
    })();
  }, [agendamentoId]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-xl font-bold text-slate-900">Placa confirmada</h2>
      <p className="text-sm text-slate-600">Você vai preencher as categorias abaixo:</p>
      <ul className="space-y-2">
        {categorias.length === 0 && <li className="text-sm text-slate-500">Carregando checklist...</li>}
        {categorias.map((c) => (
          <li key={c.categoria} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="font-semibold text-slate-800">{c.categoria.replace(/_/g, " ")}</span>
            <span className="text-sm font-bold text-teal-900">{c.total} itens</span>
          </li>
        ))}
      </ul>
      <button
        disabled={enviando}
        onClick={onIniciar}
        className="min-h-14 w-full rounded-xl bg-teal-900 text-lg font-bold text-white disabled:opacity-40"
      >
        {enviando ? "Abrindo..." : "Iniciar vistoria"}
      </button>
    </div>
  );
}