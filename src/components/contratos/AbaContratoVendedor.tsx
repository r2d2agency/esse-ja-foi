import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileSignature, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusContrato } from "@/components/contratos/StatusContrato";
import { prepararGeracaoFn, gerarContratoFn } from "@/lib/contratos.functions";
import { useAuth } from "@/hooks/use-auth";

export function AbaContratoVendedor({ vendedorId }: { vendedorId: string }) {
  const { user } = useAuth();
  const preparar = useServerFn(prepararGeracaoFn);
  const gerar = useServerFn(gerarContratoFn);
  const [modal, setModal] = useState(false);
  const [modeloId, setModeloId] = useState("");

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["contrato-vendedor", vendedorId],
    queryFn: () => preparar({ data: { vendedorId } }),
  });

  if (isLoading) return <p className="text-slate-400 text-sm">Carregando contrato...</p>;
  if (!res || !(res as any).ok) return <p className="text-red-600 text-sm">{(res as any)?.message}</p>;

  const { perfil, complianceStatus, contratoAtual, modelos, faltantes, enderecoResumo } = (res as any).data;
  const aprovado = complianceStatus === "APROVADO";
  const contratos = contratoAtual ? [contratoAtual] : [];
  const elegivel = aprovado && contratoAtual?.status === "ASSINADO";

  const handleGerar = async () => {
    const t = toast.loading("Gerando contrato...");
    try {
      const r: any = await gerar({ data: { vendedorId, modeloId: modeloId || modelos[0]?.id, autorId: user?.id, autorNome: user?.nome } });
      if (r?.ok === false) toast.error(r.message);
      else {
        toast.success("Contrato gerado com sucesso.");
        setModal(false);
        refetch();
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar contrato.");
    } finally {
      toast.dismiss(t);
    }
  };

  if (!aprovado) {
    return (
      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-10 text-center space-y-3">
          <Lock className="h-8 w-8 mx-auto text-slate-300" />
          <p className="font-bold text-slate-700">O contrato será liberado após a conclusão do compliance.</p>
          <p className="text-sm text-slate-500">Status atual do compliance: {complianceStatus}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-950">Contrato</h3>
              <p className="text-sm text-slate-500">Contrato de intermediação do vendedor.</p>
            </div>
            {!contratoAtual || ["CANCELADO", "RECUSADO", "EXPIRADO"].includes(contratoAtual.status) ? (
              <Button className="bg-teal-600 hover:bg-teal-700 font-bold" onClick={() => setModal(true)}>
                <FileSignature className="mr-2 h-4 w-4" /> Gerar contrato
              </Button>
            ) : (
              <Button asChild variant="outline" className="font-bold">
                <Link to="/admin/contrato/$id" params={{ id: contratoAtual.id }}>Visualizar contrato</Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
              <StatusContrato status={contratoAtual?.status || "NAO_GERADO"} className="mt-1" />
            </div>
            <Info titulo="Identificador" valor={contratoAtual?.identificador} />
            <Info titulo="Modelo" valor={contratoAtual?.modelo_nome} />
            <Info titulo="Versão" valor={contratoAtual ? String(contratoAtual.versao) : undefined} />
            <Info titulo="Gerado em" valor={contratoAtual?.gerado_em && format(new Date(contratoAtual.gerado_em), "dd/MM/yyyy HH:mm")} />
            <Info titulo="Enviado em" valor={contratoAtual?.enviado_em && format(new Date(contratoAtual.enviado_em), "dd/MM/yyyy HH:mm")} />
            <Info titulo="Assinado em" valor={contratoAtual?.assinado_em && format(new Date(contratoAtual.assinado_em), "dd/MM/yyyy HH:mm")} />
            <Info titulo="Responsável" valor={contratoAtual?.responsavel_nome} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="text-sm">
            <p className="font-bold text-slate-800">Elegível para avançar</p>
            <p className="text-slate-500">Compliance: {aprovado ? "✓ Aprovado" : complianceStatus} • Contrato: {contratoAtual?.status === "ASSINADO" ? "✓ Assinado" : "Pendente"}</p>
          </div>
          <span className={elegivel ? "text-teal-700 font-black" : "text-slate-400 font-bold"}>
            {elegivel ? "✓ SIM" : "NÃO"}
          </span>
        </CardContent>
      </Card>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-950">Gerar contrato</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info titulo="Vendedor" valor={perfil.nome} />
              <Info titulo="CPF" valor={perfil.cpf} />
              <Info titulo="E-mail" valor={perfil.email} />
              <Info titulo="Telefone" valor={perfil.whatsapp} />
              <div className="col-span-2"><Info titulo="Endereço" valor={enderecoResumo} /></div>
            </div>

            {faltantes.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-bold text-amber-800 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Existem informações pendentes antes da geração do contrato.</p>
                <ul className="mt-2 list-disc list-inside text-amber-700">
                  {faltantes.map((f: string) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Modelo do contrato</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                  value={modeloId || modelos[0]?.id || ""}
                  onChange={(e) => setModeloId(e.target.value)}
                >
                  {modelos.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nome} — Versão {m.versao}</option>
                  ))}
                </select>
              </div>
            )}

            <Button className="w-full bg-teal-600 hover:bg-teal-700 font-bold" disabled={faltantes.length > 0 || modelos.length === 0} onClick={handleGerar}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Gerar contrato
            </Button>
          </div>
        </div>
      )}

      {contratos.length === 0 && null}
    </div>
  );
}

function Info({ titulo, valor }: { titulo: string; valor?: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
      <p className="font-semibold text-slate-800">{valor || "—"}</p>
    </div>
  );
}
