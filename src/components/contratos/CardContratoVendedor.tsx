import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileSignature, CheckCircle2 } from "lucide-react";
import { contratoDoVendedorFn } from "@/lib/contratos.functions";
import { Button } from "@/components/ui/button";

export function CardContratoVendedor({ vendedorId }: { vendedorId: string }) {
  const carregar = useServerFn(contratoDoVendedorFn);
  const { data: res } = useQuery({
    queryKey: ["portal-contrato", vendedorId],
    queryFn: () => carregar({ data: { vendedorId } }),
    enabled: !!vendedorId,
  });

  const contrato = (res as any)?.ok ? (res as any).data.contratoAtual : null;
  if (!contrato || contrato.status === "GERADO") return null;

  if (contrato.status === "ASSINADO") {
    return (
      <section className="rounded-2xl border border-teal-200 bg-teal-50 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-teal-700" />
          <h2 className="text-lg font-bold text-slate-900">Contrato assinado</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Esta etapa foi concluída com sucesso.</p>
        <Button asChild variant="outline" className="mt-5 h-11 rounded-xl">
          <Link to="/vendedor/contrato">Ver contrato</Link>
        </Button>
      </section>
    );
  }

  if (["CANCELADO", "RECUSADO"].includes(contrato.status)) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50">
          <FileSignature className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Contrato disponível</h2>
          <p className="text-sm text-slate-500">Precisamos da sua assinatura para continuar.</p>
        </div>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-600">
        {contrato.status === "EXPIRADO" ? "Link expirado" : "Aguardando assinatura"}
      </p>
      <Button asChild className="mt-5 h-12 w-full rounded-xl bg-teal-700 font-semibold text-white hover:bg-teal-800">
        <Link to="/vendedor/contrato">Ver e assinar contrato</Link>
      </Button>
    </section>
  );
}
