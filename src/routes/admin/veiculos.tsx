import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVeiculosAdminFn } from "@/lib/admin-veiculos.functions";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/veiculos")({
  component: AdminVeiculosPage,
});

function AdminVeiculosPage() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  
  const getVeiculos = useServerFn(getVeiculosAdminFn);
  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["admin-veiculos", { busca, status }],
    queryFn: () => getVeiculos({ data: { busca, status_analise: status === "TODOS" ? undefined : status } })
  });

  const veiculos = res?.data || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-950">Veículos</h1>
        <div className="flex gap-2">
          {["TODOS", "AGUARDANDO_ANALISE", "EM_ANALISE"].map((s) => (
            <Button 
              key={s} 
              variant={status === s ? "default" : "outline"} 
              onClick={() => setStatus(s)}
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Buscar por placa, marca, modelo ou vendedor" 
          className="pl-10"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <Card>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-6 py-3">Veículo</th>
              <th className="px-6 py-3">Placa</th>
              <th className="px-6 py-3">Vendedor</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Atualização</th>
              <th className="px-6 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {veiculos.map((v: any) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold">{v.marca} {v.modelo}</td>
                <td className="px-6 py-4 font-mono">{v.placa}</td>
                <td className="px-6 py-4">{v.vendedor_nome}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded bg-slate-100 font-bold text-xs uppercase">{v.status_analise}</span>
                </td>
                <td className="px-6 py-4">{format(new Date(v.atualizado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm">Analisar <ChevronRight className="ml-1 h-3 w-3" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
