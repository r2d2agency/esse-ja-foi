import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Mail, UserCheck, Users, FileCheck, RefreshCw, UserPlus, ShieldAlert } from "lucide-react";
import { listarVendedoresFn, listarCompradoresFn, gerenciarUsuarioFn } from "@/lib/admin.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsuariosAdminPage,
});

function UsuariosAdminPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [compradores, setCompradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState<any | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    role: "vistoriador",
    password: ""
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resVendedores, resCompradores] = await Promise.all([
        listarVendedoresFn(),
        listarCompradoresFn()
      ]);
      
      if (resVendedores.ok) setVendedores(resVendedores.data);
      if (resCompradores.ok) setCompradores(resCompradores.data);
      
      if (!resVendedores.ok) toast.error(resVendedores.message || "Erro ao carregar vendedores.");
      if (!resCompradores.ok) toast.error(resCompradores.message || "Erro ao carregar compradores.");
    } catch (err) {
      console.error("[admin/usuarios] Erro:", err);
      toast.error("Falha na rede.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const toggleStatus = async (id: string, atual: boolean) => {
    const res = await gerenciarUsuarioFn({ data: { id, ativo: !atual } });
    if (res.ok) {
      toast.success(atual ? "Usuário desativado." : "Usuário ativado.");
      void carregar();
    } else {
      toast.error("Erro ao alterar status.");
    }
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.password) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    const res = await gerenciarUsuarioFn({ data: { 
      nome: formData.nome,
      email: formData.email,
      whatsapp: formData.whatsapp,
      role: formData.role as any,
      password: formData.password
    }});

    if (res.ok) {
      toast.success("Usuário criado com sucesso!");
      setModalNovo(false);
      setFormData({ nome: "", email: "", whatsapp: "", role: "vistoriador", password: "" });
      void carregar();
    } else {
      toast.error(res.message || "Erro ao criar usuário.");
    }
  };

  const enviarSenhaTemporaria = (email: string) => {
    toast.info(`Funcionalidade de envio de e-mail para ${email} será integrada com o SMTP configurado.`);
  };

  return (
    <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Usuários</h1>
            <p className="text-sm text-slate-500">Aprove ou reprove o acesso de vendedores e compradores à plataforma.</p>
          </div>
          <Button onClick={() => setModalNovo(true)} className="bg-teal-700 hover:bg-teal-800 gap-2">
            <UserPlus className="h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        <Tabs defaultValue="vendedores" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="vendedores" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Vendedores
            </TabsTrigger>
            <TabsTrigger value="compradores" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Compradores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vendedores" className="space-y-4 pt-4">
            <DataTable
              data={vendedores}
              emptyMessage={loading ? "Carregando..." : "Nenhum vendedor encontrado."}
              columns={[
                { header: "Nome", accessor: "nome" },
                { header: "E-mail", accessor: "email" },
                { header: "WhatsApp", accessor: "whatsapp" },
                { 
                  header: "Cadastro", 
                  accessor: (v: any) => (
                    <Badge variant={v.cadastro_completo ? "outline" : "secondary"} className="gap-1">
                      {v.cadastro_completo ? <CheckCircle className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                      {v.cadastro_completo ? "Completo" : "Pendente"}
                    </Badge>
                  ) 
                },
                { header: "Cidade", accessor: (v: any) => v.cidade ? `${v.cidade}/${v.uf}` : "—" },
                { 
                  header: "Status", 
                  accessor: (v: any) => (
                    <Badge className={v.ativo ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                      {v.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  ) 
                },
                {
                  header: "Ações",
                  accessor: (v: any) => (
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setDetalhes(v)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => void toggleStatus(v.id, v.ativo)}
                        title={v.ativo ? "Desativar" : "Ativar"}
                      >
                        {v.ativo ? <XCircle className="h-4 w-4 text-red-600" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </TabsContent>

          <TabsContent value="compradores" className="space-y-4 pt-4">
            <DataTable
              data={compradores}
              emptyMessage={loading ? "Carregando..." : "Nenhum comprador encontrado."}
              columns={[
                { header: "Nome", accessor: "nome" },
                { header: "E-mail", accessor: "email" },
                { header: "WhatsApp", accessor: "whatsapp" },
                { header: "Cidade", accessor: (v: any) => v.cidade ? `${v.cidade}/${v.uf}` : "—" },
                { 
                  header: "Status", 
                  accessor: (v: any) => (
                    <Badge className={v.ativo ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                      {v.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  ) 
                },
                {
                  header: "Ações",
                  accessor: (v: any) => (
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setDetalhes(v)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => void toggleStatus(v.id, v.ativo)}
                        title={v.ativo ? "Desativar" : "Ativar"}
                      >
                        {v.ativo ? <XCircle className="h-4 w-4 text-red-600" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </TabsContent>
        </Tabs>

        {/* Modal Novo Usuário */}
        <Sheet open={modalNovo} onOpenChange={setModalNovo}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-teal-700" /> Criar Novo Usuário
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={criarUsuario} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input id="nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Ex: João Silva" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="joao@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Perfil *</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vistoriador">Vistoriador</SelectItem>
                    <SelectItem value="operacao">Operação</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha Inicial *</Label>
                <Input id="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="******" required />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800">
                  Criar Usuário
                </Button>
                <p className="text-[10px] text-slate-500 text-center">
                  O usuário será criado com status ativo e poderá logar imediatamente.
                </p>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        {/* Modal Detalhes */}
        <Sheet open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Detalhes do Usuário</SheetTitle>
            </SheetHeader>
            {detalhes && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Nome Completo</label>
                    <p className="text-slate-900 text-base">{detalhes.nome}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">E-mail</label>
                    <p className="text-slate-900">{detalhes.email}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">WhatsApp</label>
                    <p className="text-slate-900">{detalhes.whatsapp || "—"}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Perfil</label>
                    <Badge variant="outline" className="capitalize">{detalhes.role}</Badge>
                  </div>
                  <div className="col-span-2">
                    <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Cadastrado em</label>
                    <p className="text-slate-900">{formatDate(detalhes.criado_em)}</p>
                  </div>
                </div>

                {detalhes.role === 'vendedor' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-teal-600" /> Documentação
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                        <p className="font-medium">CNH (Frente e Verso)</p>
                        {detalhes.documento_cnh_url ? (
                          <a href={detalhes.documento_cnh_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline mt-1 block">Ver documento</a>
                        ) : (
                          <p className="text-slate-400 italic">Não enviado</p>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                        <p className="font-medium">CRLV do Veículo</p>
                        {detalhes.documento_crlv_url ? (
                          <a href={detalhes.documento_crlv_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline mt-1 block">Ver documento</a>
                        ) : (
                          <p className="text-slate-400 italic">Não enviado</p>
                        )}
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                        <p className="font-medium">Selfie com Documento</p>
                        {detalhes.documento_selfie_url ? (
                          <a href={detalhes.documento_selfie_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline mt-1 block">Ver foto</a>
                        ) : (
                          <p className="text-slate-400 italic">Não enviado</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t flex flex-col gap-3">
                   <Button 
                    variant={detalhes.ativo ? "destructive" : "default"}
                    className="w-full"
                    onClick={() => {
                      void toggleStatus(detalhes.id, detalhes.ativo);
                      setDetalhes(null);
                    }}
                   >
                     {detalhes.ativo ? "Bloquear Acesso" : "Liberar Acesso"}
                   </Button>
                   <Button variant="outline" className="w-full" onClick={() => enviarSenhaTemporaria(detalhes.email)}>
                      <Mail className="mr-2 h-4 w-4" /> Enviar Link de Recuperação
                   </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
  );
}
