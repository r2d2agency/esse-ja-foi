import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Search, FileSignature, ChevronRight, CalendarDays } from "lucide-react";
import { listarContratosFn } from "@/lib/contratos.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FILTROS_CONTRATO, StatusContrato, mascararCpf } from "@/components/contratos/StatusContrato";
import { format } from "date-fns";

const searchSchema = z.object({ status: z.string().optional() });

export const Route = createFileRoute("/admin/contratos")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Contratos | ESSE JÁ FOI" },
      { name: "description", content: "Geração, envio, assinatura e acompanhamento de contratos de intermediação." },
      { property: "og:title", content: "Contratos | ESSE JÁ FOI" },
      { property: "og:description", content: "Gestão completa dos contratos dos vendedores." },
    ],
  }),
  component: ContratosPage,
});

function ContratosPage() {
  const search = useSearch({ from: "/admin/contratos" });
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(search.status || "TODOS");
  const [data, setData] = useState("");
  const [modeloId, setModeloId] = useState("");

  const listar = useServerFn(listarContratosFn);
  const { data: res, isLoading } = useQuery({
    queryKey: ["admin-contratos", busca, status, data, modeloId],
    queryFn: () => listar({ data: { busca, status, data, modeloId } }),
  });

  const gerados: any[] = (res as any)?.data?.gerados ?? [];
  const naoGerados: any[] = (res as any)?.data?.naoGerados ?? [];
  const modelos: any[] = (res as any)?.modelos ?? [];

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Contratos</h1>
        <p className="text-slate-500 font-medium">Geração, envio, assinatura e acompanhamento dos contratos dos vendedores.</p>
      </div>

      <Card className="border-slate-200 shadow-none">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por vendedor, CPF ou número do contrato"
                className="pl-10 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="pl-10 w-[190px] bg-slate-50 border-slate-200" />
            </div>
            <select
              value={modeloId}
              onChange={(e) => setModeloId(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">Todos os modelos</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nome} — v{m.versao}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_CONTRATO.map((f) => (
              <button
                key={f.valor}
                onClick={() => setStatus(f.valor)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
                  status === f.valor ? "bg-slate-950 text-white border-slate-950" : "bg-white text-slate-600 border-slate-200 hover:border-teal-500",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-none overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b">
              <tr>
                <th className="px-5 py-3">Contrato</th>
                <th className="px-5 py-3">Vendedor</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">Modelo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Gerado em</th>
                <th className="px-5 py-3">Última atualização</th>
                <th className="px-5 py-3">Responsável</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">Carregando contratos...</td></tr>
              )}
              {!isLoading && gerados.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4 font-bold text-slate-900">{c.identificador}<span className="ml-2 text-[10px] font-medium text-slate-400">v{c.versao}</span></td>
                  <td className="px-5 py-4">{c.vendedor_nome}</td>
                  <td className="px-5 py-4 text-slate-500">{mascararCpf(c.vendedor_cpf)}</td>
                  <td className="px-5 py-4 text-slate-600">{c.modelo_nome}</td>
                  <td className="px-5 py-4"><StatusContrato status={c.status} /></td>
                  <td className="px-5 py-4 text-slate-500">{format(new Date(c.gerado_em), "dd/MM/yyyy")}</td>
                  <td className="px-5 py-4 text-slate-500">{format(new Date(c.atualizado_em), "dd/MM/yyyy HH:mm")}</td>
                  <td className="px-5 py-4 text-slate-600">{c.responsavel_nome || "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <Button asChild variant="ghost" size="sm" className="text-teal-700 font-bold">
                      <Link to="/admin/contrato/$id" params={{ id: c.id }}>Ver contrato <ChevronRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && naoGerados.map((v) => (
                <tr key={v.vendedor_id} className="hover:bg-slate-50/60 bg-white">
                  <td className="px-5 py-4 text-slate-400 font-bold">—</td>
                  <td className="px-5 py-4">{v.vendedor_nome}</td>
                  <td className="px-5 py-4 text-slate-500">{mascararCpf(v.vendedor_cpf)}</td>
                  <td className="px-5 py-4 text-slate-400">—</td>
                  <td className="px-5 py-4"><StatusContrato status="NAO_GERADO" /></td>
                  <td className="px-5 py-4 text-slate-400">—</td>
                  <td className="px-5 py-4 text-slate-400">—</td>
                  <td className="px-5 py-4 text-slate-400">—</td>
                  <td className="px-5 py-4 text-right">
                    <Button asChild variant="ghost" size="sm" className="text-teal-700 font-bold">
                      <Link to="/admin/vendedor/$id" params={{ id: v.vendedor_id }}>Gerar contrato <ChevronRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!isLoading && gerados.length === 0 && naoGerados.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center text-slate-400">
                    <FileSignature className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                    Nenhum contrato encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
