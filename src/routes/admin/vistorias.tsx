import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getVeiculosAguardandoVistoriaFn } from "@/lib/vistorias.functions";
import { getFilaAnalisePosVistoriaFn } from "@/lib/analise-pos-vistoria.functions";
import { 
  Search, 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/vistorias")({
  head: () => ({
    meta: [{ title: "Vistorias | ESSE JÁ FOI" }],
  }),
  component: VistoriasAdminPage,
});

function VistoriasAdminPage() {
  const [activeTab, setActiveTab] = useState("aguardando_analise");
  const [buscaFila, setBuscaFila] = useState("");
  const [buscaAgendamento, setBuscaAgendamento] = useState("");
  
  const getAguardando = useServerFn(getVeiculosAguardandoVistoriaFn);
  const getFilaPosVistoria = useServerFn(getFilaAnalisePosVistoriaFn);

  const { data: aguardandoRes, isLoading: loadingAguardando } = useQuery({
    queryKey: ["admin-veiculos-aguardando-vistoria"],
    queryFn: () => getAguardando(),
    enabled: activeTab === 'aguardando'
  });

  const { data: posVistoriaRes, isLoading: loadingPosVistoria } = useQuery({
    queryKey: ["admin-veiculos-aguardando-analise-pos"],
    queryFn: () => getFilaPosVistoria(),
    enabled: activeTab === 'aguardando_analise'
  });

  const aguardando = aguardandoRes?.data || [];
  const filaPosVistoria = posVistoriaRes?.data || [];
  const termoFila = buscaFila.trim().toLowerCase();
  const termoAgendamento = buscaAgendamento.trim().toLowerCase();
  const filaPosVistoriaFiltrada = filaPosVistoria.filter((v: any) =>
    !termoFila ||
    `${v.marca || ""} ${v.modelo || ""} ${v.placa || ""} ${v.vendedor_nome || ""} ${v.vistoriador_nome || ""} ${v.unidade_nome || ""}`
      .toLowerCase()
      .includes(termoFila)
  );
  const aguardandoFiltrado = aguardando.filter((v: any) =>
    !termoAgendamento ||
    `${v.marca || ""} ${v.modelo || ""} ${v.placa || ""} ${v.vendedor_nome || ""} ${v.vendedor_cidade || ""} ${v.vendedor_uf || ""}`
      .toLowerCase()
      .includes(termoAgendamento)
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Vistorias</h1>
          <p className="text-slate-500 font-medium">Gestão das filas operacionais de agendamento e análise pós-vistoria.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start rounded-none h-auto p-0 gap-8">
          {[
            { id: "aguardando_analise", label: "Aguardando análise" },
            { id: "aguardando", label: "Aguardando agendamento" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="bg-transparent border-none p-0 pb-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:text-teal-600 font-bold text-xs uppercase tracking-widest text-slate-400"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="aguardando_analise" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">Fila de análise pós-vistoria</h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar na fila..."
                  className="pl-10 h-10 border-slate-200 bg-white"
                  value={buscaFila}
                  onChange={(e) => setBuscaFila(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-slate-200 shadow-none overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Veículo / Placa</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vistoriador / Unidade</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Conclusão</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsável</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filaPosVistoriaFiltrada.map((v: any) => (
                      <tr key={v.vistoria_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{v.marca} {v.modelo}</span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{v.placa}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_nome}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{v.vistoriador_nome || 'N/I'}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">{v.unidade_nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">
                              {v.concluido_em ? format(new Date(v.concluido_em), 'dd/MM HH:mm') : '-'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium">
                              {v.concluido_em ? "Concluída" : "Sem horário"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {v.responsavel_nome ? (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-tight">
                              {v.responsavel_nome}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Livre</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-8 rounded-lg">
                            <Link to="/admin/analise-vistoria/$id" params={{ id: v.veiculo_id }}>Analisar</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {filaPosVistoriaFiltrada.length === 0 && !loadingPosVistoria && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          Nenhuma vistoria aguardando análise.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aguardando" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">Fila de espera</h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por placa ou vendedor..."
                  className="pl-10 h-10 border-slate-200 bg-white"
                  value={buscaAgendamento}
                  onChange={(e) => setBuscaAgendamento(e.target.value)}
                />
              </div>
            </div>

            <Card className="border-slate-200 shadow-none overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Veículo</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Placa</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {aguardandoFiltrado.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-900">{v.marca} {v.modelo}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-mono text-[11px] border-slate-200">{v.placa}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_nome}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{v.vendedor_cidade}/{v.vendedor_uf}</td>
                        <td className="px-6 py-4">
                          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 text-[10px] font-black uppercase">Aguardando</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild size="sm" className="bg-slate-900 hover:bg-teal-700 text-white font-bold h-8 rounded-lg">
                            <Link to="/admin/veiculo/$id" params={{ id: v.id }}>Agendar</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {aguardandoFiltrado.length === 0 && !loadingAguardando && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          Nenhum veículo aguardando agendamento no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
