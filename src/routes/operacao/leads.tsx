import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout as BackofficeLayout } from "@/components/layout/AdminLayout";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, Car, Calendar, User, MessageSquare, History, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { formatPhone, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  listarLeadsFn,
  historicoLeadFn,
  registrarInteracaoFn,
  atualizarLeadFn,
  converterLeadFn,
} from "@/lib/leads.functions";

export const Route = createFileRoute("/operacao/leads")({
  head: () => ({
    meta: [
      { title: "Gestão de Leads | ESSE JÁ FOI" },
      { name: "description", content: "Acompanhe, atenda e converta os leads de venda de veículos recebidos pelo site e WhatsApp." },
      { property: "og:title", content: "Gestão de Leads | ESSE JÁ FOI" },
      { property: "og:description", content: "Funil completo de atendimento dos leads de captação de veículos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeadsPage,
});

type Lead = Record<string, any>;

const TODOS = "TODOS";

function LeadsPage() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({ status: TODOS, origem: TODOS, cidade: "", responsavel: "", data: "" });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [note, setNote] = useState("");

  const listar = useServerFn(listarLeadsFn);
  const buscarHistorico = useServerFn(historicoLeadFn);
  const registrar = useServerFn(registrarInteracaoFn);
  const atualizar = useServerFn(atualizarLeadFn);
  const converter = useServerFn(converterLeadFn);

  const params = {
    status: filtros.status === TODOS ? "" : filtros.status,
    origem: filtros.origem === TODOS ? "" : filtros.origem,
    cidade: filtros.cidade,
    responsavel: filtros.responsavel,
    data: filtros.data,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["leads", params],
    queryFn: () => listar({ data: params }),
  });

  const leads = (data?.data ?? []) as Array<Lead>;
  const ind = data?.indicadores;

  const { data: historico } = useQuery({
    queryKey: ["lead-historico", selectedLead?.['id']],
    queryFn: () => buscarHistorico({ data: { id: String(selectedLead?.['id']) } }),
    enabled: !!selectedLead?.['id'],
  });

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead-historico"] });
  };

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsSheetOpen(true);
  };

  const handleAddNote = async () => {
    if (!note.trim() || !selectedLead) return;
    const res = await registrar({ data: { id: String(selectedLead['id']), acao: note.trim() } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Interação registrada.");
    setNote("");
    recarregar();
  };

  const handleResponsavel = async (responsavel: string) => {
    if (!selectedLead) return;
    const res = await atualizar({ data: { id: String(selectedLead['id']), responsavel } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setSelectedLead({ ...selectedLead, responsavel });
    toast.success("Responsável atribuído.");
    recarregar();
  };

  const handleStatus = async (status: string) => {
    if (!selectedLead) return;
    const res = await atualizar({ data: { id: String(selectedLead['id']), status } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setSelectedLead({ ...selectedLead, status });
    recarregar();
  };

  const handleConvert = async () => {
    if (!selectedLead) return;
    const res = await converter({ data: { id: String(selectedLead['id']) } });
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Lead convertido em cliente.");
    setIsSheetOpen(false);
    recarregar();
  };

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Leads</h1>
          <p className="text-slate-500">Acompanhamento de novas oportunidades de negócio.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { label: "Leads novos", value: ind?.novos ?? 0, color: "text-blue-600", icon: Clock },
            { label: "Em atendimento", value: ind?.emAtendimento ?? 0, color: "text-amber-600", icon: MessageSquare },
            { label: "Agendados", value: ind?.agendados ?? 0, color: "text-teal-600", icon: Calendar },
            { label: "Taxa de conversão", value: `${ind?.taxaConversao ?? 0}%`, color: "text-indigo-600", icon: CheckCircle2 },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <card.icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>{isLoading ? "—" : card.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os status</SelectItem>
                <SelectItem value="NOVO">Novo</SelectItem>
                <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
                <SelectItem value="AGENDADO">Agendado</SelectItem>
                <SelectItem value="CONVERTIDO">Convertido</SelectItem>
                <SelectItem value="PERDIDO">Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtros.origem} onValueChange={(v) => setFiltros({ ...filtros, origem: v })}>
              <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todas as origens</SelectItem>
                <SelectItem value="LANDING">Landing Page</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Cidade..." value={filtros.cidade} onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })} />
            <Input placeholder="Responsável..." value={filtros.responsavel} onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })} />
            <Input type="date" value={filtros.data} onChange={(e) => setFiltros({ ...filtros, data: e.target.value })} />
          </div>

          <DataTable
            data={leads}
            emptyMessage={isLoading ? "Carregando leads..." : "Nenhum lead recebido ainda."}
            columns={[
              { header: "Data", accessor: (row) => (row['criado_em'] ? formatDate(row['criado_em']) : "—") },
              { header: "Nome", accessor: "nome" },
              {
                header: "WhatsApp",
                accessor: (row) => (
                  <a
                    href={`https://wa.me/55${row['whatsapp']}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-teal-700 hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {formatPhone(String(row['whatsapp'] ?? ""))}
                  </a>
                ),
              },
              { header: "Cidade", accessor: (row) => row['cidade'] ?? "—" },
              { header: "Veículo", accessor: (row) => [row['marca'], row['modelo'], row['ano']].filter(Boolean).join(" ") || "—" },
              {
                header: "Origem",
                accessor: (row) => (
                  <Badge variant="outline" className={row['origem'] === "WHATSAPP" ? "border-green-200 bg-green-50 text-green-700" : ""}>
                    {row['origem'] ?? "—"}
                  </Badge>
                ),
              },
              {
                header: "Status",
                accessor: (row) => (
                  <Badge
                    className={
                      row['status'] === "NOVO"
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                        : row['status'] === "EM_ATENDIMENTO"
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                          : "bg-teal-100 text-teal-700 hover:bg-teal-100"
                    }
                  >
                    {String(row['status'] ?? "").replace(/_/g, " ")}
                  </Badge>
                ),
              },
              { header: "Responsável", accessor: (row) => row['responsavel'] ?? "Aguardando" },
              {
                header: "Ações",
                accessor: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => handleOpenLead(row)} className="text-teal-700">
                    Ver ficha
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {selectedLead && (
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700">{String(selectedLead['status'] ?? "").replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{selectedLead['origem'] ?? "—"}</Badge>
              </div>
              <SheetTitle className="text-2xl">{selectedLead['nome']}</SheetTitle>
              <SheetDescription>Recebido em {selectedLead['criado_em'] ? formatDate(selectedLead['criado_em']) : "—"}</SheetDescription>
            </SheetHeader>

            <div className="mt-8 space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">WhatsApp</p>
                    <p className="font-medium">{formatPhone(String(selectedLead['whatsapp'] ?? ""))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Cidade</p>
                    <p className="font-medium">{selectedLead['cidade'] ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Veículo de interesse</p>
                    <p className="font-medium">
                      {[selectedLead['marca'], selectedLead['modelo'], selectedLead['ano']].filter(Boolean).join(" ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 text-xs">Responsável</p>
                    <Input
                      className="h-8"
                      defaultValue={String(selectedLead['responsavel'] ?? "")}
                      placeholder="Atribuir responsável"
                      onBlur={(e) => e.target.value && handleResponsavel(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 text-xs">Status</p>
                    <Select value={String(selectedLead['status'] ?? "NOVO")} onValueChange={handleStatus}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOVO">Novo</SelectItem>
                        <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
                        <SelectItem value="AGENDADO">Agendado</SelectItem>
                        <SelectItem value="CONVERTIDO">Convertido</SelectItem>
                        <SelectItem value="PERDIDO">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {selectedLead['mensagem'] && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{selectedLead['mensagem']}</div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  Registrar tentativa de contato
                </h3>
                <textarea
                  className="w-full rounded-md border border-slate-200 p-3 text-sm min-h-20"
                  placeholder="Descreva o contato realizado..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={handleAddNote}>
                  Registrar
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  Histórico
                </h3>
                <ul className="space-y-3">
                  {((historico?.data ?? []) as Array<Lead>).map((h) => (
                    <li key={String(h['id'])} className="border-l-2 border-slate-200 pl-3 text-sm">
                      <p className="text-slate-700">{h['acao']}</p>
                      <p className="text-xs text-slate-400">
                        {h['criado_em'] ? formatDate(h['criado_em']) : ""} · {h['usuario'] ?? "Sistema"}
                      </p>
                    </li>
                  ))}
                  {((historico?.data ?? []) as Array<Lead>).length === 0 && (
                    <li className="text-sm text-slate-400">Nenhuma interação registrada.</li>
                  )}
                </ul>
              </div>
            </div>

            <SheetFooter className="mt-8 border-t pt-6">
              <Button onClick={handleConvert} className="w-full bg-teal-900 hover:bg-teal-950 text-white gap-2">
                Converter em cliente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>
    </BackofficeLayout>
  );
}
