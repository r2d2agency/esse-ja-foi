import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Phone, 
  MapPin, 
  Car, 
  Calendar, 
  User, 
  MessageSquare, 
  History, 
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { formatPhone, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/operacao/leads")({
  component: LeadsPage,
});

const mockLeads = [
  {
    id: "1",
    data: "2026-08-11T10:00:00Z",
    nome: "Carlos Oliveira",
    whatsapp: "11999998888",
    cidade: "São Paulo - SP",
    veiculo: "Toyota Corolla 2022",
    origem: "LANDING",
    status: "NOVO",
    responsavel: "Aguardando",
    observacoes: "Interessado em venda rápida.",
    historico: [
      { data: "2026-08-11T10:05:00Z", acao: "Tentativa de contato via WhatsApp", usuario: "Sistema" }
    ]
  },
  {
    id: "2",
    data: "2026-08-11T09:30:00Z",
    nome: "Ana Pereira",
    whatsapp: "21988887777",
    cidade: "Rio de Janeiro - RJ",
    veiculo: "Honda Civic 2020",
    origem: "WHATSAPP",
    status: "EM_ATENDIMENTO",
    responsavel: "Marcos Lima",
    observacoes: "Cliente busca avaliação acima da FIPE.",
    historico: [
      { data: "2026-08-11T09:40:00Z", acao: "Atendimento iniciado", usuario: "Marcos Lima" }
    ]
  },
  {
    id: "3",
    data: "2026-08-10T15:20:00Z",
    nome: "Roberto Silva",
    whatsapp: "31977776666",
    cidade: "Belo Horizonte - MG",
    veiculo: "VW Polo 2023",
    origem: "LANDING",
    status: "AGENDADO",
    responsavel: "Julia Costa",
    observacoes: "Vistoria agendada para sexta.",
    historico: [
      { data: "2026-08-10T16:00:00Z", acao: "Agendou vistoria", usuario: "Julia Costa" }
    ]
  }
];

function LeadsPage() {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [note, setNote] = useState("");

  const handleOpenLead = (lead: any) => {
    setSelectedLead(lead);
    setIsSheetOpen(true);
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    toast.success("Tentativa registrada com sucesso!");
    setNote("");
  };

  const handleConvert = () => {
    toast.info("Redirecionando para cadastro de cliente...");
    // Em um cenário real, usaria navigate para /clientes/novo com state
  };

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Leads</h1>
            <p className="text-slate-500">Acompanhamento de novas oportunidades de negócio.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {[
            { label: "Leads Novos", value: "12", color: "text-blue-600", icon: Clock },
            { label: "Em Atendimento", value: "8", color: "text-amber-600", icon: MessageSquare },
            { label: "Vistorias Agendadas", value: "15", color: "text-teal-600", icon: Calendar },
            { label: "Taxa de Conversão", value: "24%", color: "text-indigo-600", icon: CheckCircle2 },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <card.icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NOVO">Novo</SelectItem>
                <SelectItem value="EM_ATENDIMENTO">Em Atendimento</SelectItem>
                <SelectItem value="AGENDADO">Agendado</SelectItem>
                <SelectItem value="CONVERTIDO">Convertido</SelectItem>
                <SelectItem value="PERDIDO">Perdido</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LANDING">Landing Page</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Cidade..." />
            <Input placeholder="Responsável..." />
            <Input type="date" />
          </div>

          <DataTable
            data={mockLeads}
            columns={[
              { 
                header: "Data", 
                accessor: (row) => formatDate(row.data) 
              },
              { header: "Nome", accessor: "nome" },
              { 
                header: "WhatsApp", 
                accessor: (row) => (
                  <a 
                    href={`https://wa.me/55${row.whatsapp}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-teal-700 hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {formatPhone(row.whatsapp)}
                  </a>
                )
              },
              { header: "Cidade", accessor: "cidade" },
              { header: "Veículo", accessor: "veiculo" },
              { 
                header: "Origem", 
                accessor: (row) => (
                  <Badge variant="outline" className={row.origem === 'WHATSAPP' ? 'border-green-200 bg-green-50 text-green-700' : ''}>
                    {row.origem}
                  </Badge>
                )
              },
              { 
                header: "Status", 
                accessor: (row) => (
                  <Badge className={
                    row.status === 'NOVO' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                    row.status === 'EM_ATENDIMENTO' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                    'bg-teal-100 text-teal-700 hover:bg-teal-100'
                  }>
                    {row.status.replace('_', ' ')}
                  </Badge>
                )
              },
              { header: "Responsável", accessor: "responsavel" },
              {
                header: "Ações",
                accessor: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => handleOpenLead(row)} className="text-teal-700">
                    Ver ficha
                  </Button>
                )
              }
            ]}
          />
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {selectedLead && (
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700">{selectedLead.status}</Badge>
                <Badge variant="outline">{selectedLead.origem}</Badge>
              </div>
              <SheetTitle className="text-2xl">{selectedLead.nome}</SheetTitle>
              <SheetDescription>
                Recebido em {formatDate(selectedLead.data)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-8 space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">WhatsApp</p>
                    <p className="font-medium">{formatPhone(selectedLead.whatsapp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Cidade</p>
                    <p className="font-medium">{selectedLead.cidade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <Car className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Veículo de Interesse</p>
                    <p className="font-medium">{selectedLead.veiculo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Responsável</p>
                    <Select defaultValue={selectedLead.responsavel === 'Aguardando' ? undefined : '1'}>
                      <SelectTrigger className="h-8 border-none p-0 focus:ring-0">
                        <SelectValue placeholder="Atribuir..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Marcos Lima</SelectItem>
                        <SelectItem value="2">Julia Costa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                  Anotações
                </h3>
                <textarea 
                  className="w-full min-h-[100px] p-3 text-sm rounded-lg border border-slate-200 outline-none focus:border-teal-500 transition-colors"
                  placeholder="Registre detalhes do atendimento..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button onClick={handleAddNote} className="w-full bg-slate-900 text-white" size="sm">
                  Registrar tentativa
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" />
                  Histórico
                </h3>
                <div className="space-y-4 border-l-2 border-slate-100 pl-4 ml-2">
                  {selectedLead.historico.map((item: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-200 border-2 border-white" />
                      <p className="text-xs text-slate-500">{formatDate(item.data)}</p>
                      <p className="text-sm">{item.acao}</p>
                      <p className="text-[10px] text-slate-400">Por: {item.usuario}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="mt-8 border-t pt-6">
              <Button 
                onClick={handleConvert}
                className="w-full bg-teal-900 hover:bg-teal-950 text-white gap-2"
              >
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
