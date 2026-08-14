import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  obterDetalheVendedorFn, 
  assumirAnaliseFn,
  atualizarStatusDocumentoFn 
} from "@/lib/vendedores-compliance.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  FileText, 
  ShieldCheck, 
  Car, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/vendedor/$id")({
  component: DetalheVendedorPage,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["admin-vendedor", params.id],
      queryFn: () => obterDetalheVendedorFn({ data: { id: params.id } })
    });
  }
});

function DetalheVendedorPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("resumo");
  const [selectedDoc, setSelectedDoc] = useState<{ url: string; tipo: string } | null>(null);

  const loadVendedor = useServerFn(obterDetalheVendedorFn);
  const assumir = useServerFn(assumirAnaliseFn);
  const updateDoc = useServerFn(atualizarStatusDocumentoFn);

  const { data: res, refetch } = useSuspenseQuery({
    queryKey: ["admin-vendedor", id],
    queryFn: () => loadVendedor({ data: { id } })
  });

  if (!res.ok) return <div className="p-8 text-destructive">Erro: {res.message}</div>;
  const { perfil, compliance, historico, veiculos } = res.data;

  const handleAssumir = async () => {
    if (!user) return;
    const loading = toast.loading("Assumindo análise...");
    try {
      await assumir({ data: { vendedorId: id, responsavelId: user.id } });
      toast.success("Você agora é o responsável por esta análise.");
      refetch();
    } catch (e) {
      toast.error("Erro ao assumir análise.");
    } finally {
      toast.dismiss(loading);
    }
  };

  const handleDocAction = async (tipo: string, status: string) => {
    if (!user) return;
    const loading = toast.loading("Atualizando status...");
    try {
      await updateDoc({ data: { vendedorId: id, documentoTipo: tipo, status, autorId: user.id } });
      toast.success(`Documento ${tipo.toUpperCase()} ${status === 'APROVADO' ? 'aprovado' : 'reprovado'}.`);
      refetch();
    } catch (e) {
      toast.error("Erro ao atualizar documento.");
    } finally {
      toast.dismiss(loading);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
            {perfil.nome?.[0] || "V"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{perfil.nome}</h1>
            <p className="text-slate-500">{perfil.email} • CPF: {perfil.cpf}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!compliance?.responsavel_id ? (
            <Button onClick={handleAssumir} className="bg-teal-600 hover:bg-teal-700">
              <UserCheck className="mr-2 h-4 w-4" />
              Assumir Análise
            </Button>
          ) : (
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">
                Responsável: {compliance.responsavel_nome}
              </Badge>
              <span className="text-[10px] text-slate-400 mt-1">
                Desde {format(new Date(compliance.atualizado_em), "dd/MM/yy 'às' HH:mm")}
              </span>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="resumo" className="gap-2"><User className="h-4 w-4" /> Resumo</TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2"><ShieldCheck className="h-4 w-4" /> Compliance</TabsTrigger>
          <TabsTrigger value="veiculos" className="gap-2"><Car className="h-4 w-4" /> Veículos ({veiculos.length})</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-slate-400">WhatsApp</p>
                  <p className="font-medium">{perfil.whatsapp || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Data de Cadastro</p>
                  <p className="font-medium">{format(new Date(perfil.criado_em), "dd/MM/yyyy")}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">Endereço</p>
                  <p className="font-medium">
                    {perfil.logradouro}, {perfil.numero} {perfil.complemento && `- ${perfil.complemento}`}
                    <br />
                    {perfil.bairro} - {perfil.cidade}/{perfil.estado}
                    <br />
                    CEP: {perfil.cep}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Atual</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Compliance</span>
                  <Badge className="bg-amber-500">{compliance?.status || "AGUARDANDO"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">CNH</span>
                  <Badge variant="outline">{perfil.documento_cnh_status || "PENDENTE"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">CRLV</span>
                  <Badge variant="outline">{perfil.documento_crlv_status || "PENDENTE"}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "CNH", tipo: "cnh", url: perfil.documento_cnh_url, status: perfil.documento_cnh_status },
              { label: "CRLV", tipo: "crlv", url: perfil.documento_crlv_url, status: perfil.documento_crlv_status },
              { label: "Selfie c/ Doc", tipo: "selfie", url: perfil.documento_selfie_url, status: perfil.documento_selfie_status }
            ].map((doc) => (
              <Card key={doc.tipo} className="overflow-hidden">
                <div className="aspect-video bg-slate-100 flex items-center justify-center relative group">
                  {doc.url ? (
                    <>
                      <img src={doc.url} alt={doc.label} className="object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedDoc({ url: doc.url!, tipo: doc.label })}>
                          <Eye className="mr-2 h-4 w-4" /> Visualizar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center">
                      <AlertTriangle className="h-8 w-8 mb-2" />
                      <span className="text-xs">Não enviado</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold">{doc.label}</span>
                    <Badge variant={doc.status === 'APROVADO' ? 'default' : 'outline'}>{doc.status}</Badge>
                  </div>
                  {doc.url && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleDocAction(doc.tipo, "REPROVADO")}
                      >
                        <XCircle className="mr-1 h-3 w-3" /> Reprovar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-green-600 hover:bg-green-50"
                        onClick={() => handleDocAction(doc.tipo, "APROVADO")}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Compliance</CardTitle>
              <CardDescription>Fluxo de validação de antecedentes e integridade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-slate-500 border-b pb-2">Checklist de Verificação</h4>
                  {[
                    "Documentos legíveis e sem sinais de adulteração",
                    "CPF ativo e regular na Receita Federal",
                    "Endereço confirmado via CEP/ViaCEP",
                    "Sem restrições graves em órgãos de proteção ao crédito",
                    "Selfie coincide com a foto do documento"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="h-4 w-4 rounded border border-slate-300 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-slate-200" />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-slate-500 border-b pb-2">Ações de Compliance</h4>
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" className="justify-start">
                      <Clock className="mr-2 h-4 w-4" /> Solicitar Pendências por E-mail
                    </Button>
                    <Button variant="destructive" className="justify-start">
                      <XCircle className="mr-2 h-4 w-4" /> Bloquear Cadastro permanentemente
                    </Button>
                    <Button className="justify-start bg-green-600 hover:bg-green-700">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Finalizar Análise e Aprovar Vendedor
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="veiculos" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4">Veículo</th>
                      <th className="px-6 py-4">Placa</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Cadastro</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {veiculos.map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-medium">{v.marca} {v.modelo}</td>
                        <td className="px-6 py-4">{v.placa}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline">{v.status}</Badge>
                        </td>
                        <td className="px-6 py-4">{format(new Date(v.criado_em), "dd/MM/yy")}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {veiculos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          Nenhum veículo cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {historico.map((h: any, i: number) => (
                  <div key={h.id} className="flex gap-4 relative">
                    {i !== historico.length - 1 && (
                      <div className="absolute left-[19px] top-8 bottom-[-24px] w-px bg-slate-100" />
                    )}
                    <div className="h-10 w-10 rounded-full border border-slate-100 bg-white shadow-sm flex items-center justify-center shrink-0 z-10">
                      <History className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex flex-col gap-1 pb-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{h.acao}</span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {format(new Date(h.criado_em), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{h.detalhe}</p>
                      <span className="text-[11px] text-slate-400">Por: {h.autor_nome || "Sistema"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Doc Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-5xl w-full h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-white">
              <h3 className="font-bold">{selectedDoc.tipo}</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>Fechar</Button>
              </div>
            </div>
            <div className="flex-1 bg-slate-900 flex items-center justify-center p-4">
              <img 
                src={selectedDoc.url} 
                alt="Documento" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
