import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, FileSignature } from "lucide-react";
import { contratoDoVendedorFn, marcarContratoVisualizadoFn, registrarRetornoAssinaturaFn } from "@/lib/contratos.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusContrato } from "@/components/contratos/StatusContrato";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/vendedor/contrato")({
  head: () => ({
    meta: [
      { title: "Meu contrato | ESSE JÁ FOI" },
      { name: "description", content: "Visualize e assine o contrato de intermediação de venda do seu veículo." },
      { property: "og:title", content: "Meu contrato | ESSE JÁ FOI" },
      { property: "og:description", content: "Assine seu contrato para avançar com a venda do veículo." },
    ],
  }),
  component: ContratoVendedorPage,
});

function ContratoVendedorPage() {
  const { user } = useAuth();
  const carregar = useServerFn(contratoDoVendedorFn);
  const visualizar = useServerFn(marcarContratoVisualizadoFn);
  const retorno = useServerFn(registrarRetornoAssinaturaFn);
  const [recusando, setRecusando] = useState(false);
  const [comentario, setComentario] = useState("");

  const { data: res, refetch } = useQuery({
    queryKey: ["portal-contrato-detalhe", user?.id],
    queryFn: () => carregar({ data: { vendedorId: user?.id || "" } }),
    enabled: !!user?.id,
  });

  const contrato = (res as any)?.ok ? (res as any).data.contratoAtual : null;

  useEffect(() => {
    if (contrato?.id && contrato.status === "ENVIADO") {
      visualizar({ data: { contratoId: contrato.id } }).then(() => refetch());
    }
  }, [contrato?.id, contrato?.status]);

  if (!contrato) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-slate-500">Nenhum contrato disponível no momento.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/vendedor">Voltar</Link></Button>
      </div>
    );
  }

  const assinar = async () => {
    const t = toast.loading("Registrando assinatura...");
    try {
      const r: any = await retorno({ data: { contratoId: contrato.id, evento: "ASSINADO", provedor: "PORTAL" } });
      if (r?.ok === false) toast.error(r.message);
      else toast.success("Contrato assinado com sucesso.");
      refetch();
    } finally {
      toast.dismiss(t);
    }
  };

  const recusar = async () => {
    const t = toast.loading("Registrando recusa...");
    try {
      await retorno({ data: { contratoId: contrato.id, evento: "RECUSADO", provedor: "PORTAL", comentario } });
      toast.success("Recusa registrada.");
      setRecusando(false);
      refetch();
    } finally {
      toast.dismiss(t);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/vendedor"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contrato {contrato.identificador}</h1>
          <p className="text-sm text-slate-500">{contrato.modelo_nome} — versão {contrato.versao}</p>
        </div>
        <StatusContrato status={contrato.status} className="ml-auto" />
      </div>

      {contrato.status === "ASSINADO" && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <p className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-teal-700" /> Contrato assinado</p>
          <p className="text-sm text-slate-600 mt-1">Esta etapa foi concluída com sucesso.</p>
          <p className="text-xs text-slate-500 mt-2">Assinado em {format(new Date(contrato.assinado_em), "dd/MM/yyyy 'às' HH:mm")}</p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-8 max-h-[60vh] overflow-auto">
        <pre className="whitespace-pre-wrap font-serif text-slate-800 text-sm">{contrato.conteudo}</pre>
      </div>

      {["ENVIADO", "VISUALIZADO"].includes(contrato.status) && (
        <div className="space-y-4">
          <Button onClick={assinar} className="h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800">
            <FileSignature className="mr-2 h-4 w-4" /> Assinar contrato
          </Button>
          {!recusando ? (
            <Button variant="ghost" className="w-full text-slate-500" onClick={() => setRecusando(true)}>Recusar contrato</Button>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} placeholder="Conte o motivo da recusa (opcional)" />
              <Button variant="destructive" className="w-full" onClick={recusar}>Confirmar recusa</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
