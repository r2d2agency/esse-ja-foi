import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Mail, Key } from "lucide-react";
import { listarVendedoresFn, gerenciarUsuarioFn } from "@/lib/admin.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/admin/usuarios")({
  component: UsuariosAdminPage,
});

function UsuariosAdminPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalhes, setDetalhes] = useState<any | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await listarVendedoresFn();
    if (res.ok) setVendedores(res.data);
    setLoading(false);
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

  const enviarSenhaTemporaria = (email: string) => {
    toast.info(`Funcionalidade de envio de e-mail para ${email} será integrada com o SMTP configurado.`);
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Vendedores</h1>
          <p className="text-sm text-slate-500">Aprove ou reprove o acesso de vendedores à plataforma.</p>
        </div>

        <DataTable
          data={vendedores}
          emptyMessage={loading ? "Carregando..." : "Nenhum vendedor encontrado."}
          columns={[
            { header: "Nome", accessor: "nome" },
            { header: "E-mail", accessor: "email" },
            { header: "WhatsApp", accessor: "whatsapp" },
            { header: "Cidade", accessor: (v: any) => `${v.cidade}/${v.uf}` },
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
                  <Button size="icon" variant="ghost" onClick={() => enviarSenhaTemporaria(v.email)} title="Enviar senha temporária">
                    <Key className="h-4 w-4 text-amber-600" />
                  </Button>
                </div>
              )
            }
          ]}
        />

        <Sheet open={!!detalhes} onOpenChange={() => setDetalhes(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Detalhes do Vendedor</SheetTitle>
            </SheetHeader>
            {detalhes && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-bold text-slate-500">Nome</label>
                    <p className="text-slate-900">{detalhes.nome}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">E-mail</label>
                    <p className="text-slate-900">{detalhes.email}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">WhatsApp</label>
                    <p className="text-slate-900">{detalhes.whatsapp}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">CPF</label>
                    <p className="text-slate-900">{detalhes.cpf}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Cidade/UF</label>
                    <p className="text-slate-900">{detalhes.cidade}/{detalhes.uf}</p>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500">Cadastrado em</label>
                    <p className="text-slate-900">{formatDate(detalhes.criado_em)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t flex flex-col gap-2">
                   <Button 
                    className={detalhes.ativo ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                    onClick={() => {
                      void toggleStatus(detalhes.id, detalhes.ativo);
                      setDetalhes(null);
                    }}
                   >
                     {detalhes.ativo ? "Bloquear Acesso" : "Liberar Acesso"}
                   </Button>
                   <Button variant="outline" onClick={() => enviarSenhaTemporaria(detalhes.email)}>
                      <Mail className="mr-2 h-4 w-4" /> Enviar Senha Temporária
                   </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </BackofficeLayout>
  );
}
