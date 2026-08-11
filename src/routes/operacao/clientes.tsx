import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { formatDocumento, isValidDocumento, tipoPessoa } from "@/lib/validators";
import { listarClientesFn, removerClienteFn, salvarClienteFn } from "@/lib/cadastro.functions";

export const Route = createFileRoute("/operacao/clientes")({
  component: ClientesPage,
  head: () => ({
    meta: [
      { title: "Clientes | ESSE JÁ FOI" },
      { name: "description", content: "Cadastro de clientes com validação de CPF e CNPJ na plataforma ESSE JÁ FOI." },
      { property: "og:title", content: "Clientes | ESSE JÁ FOI" },
      { property: "og:description", content: "Gestão de clientes proprietários de veículos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Cliente = Record<string, any>;

const vazio = {
  id: undefined as string | undefined,
  nome: "",
  documento: "",
  email: "",
  telefone: "",
  whatsapp: "",
  cidade: "",
  uf: "",
  cep: "",
  endereco: "",
  observacoes: "",
};

function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erroDb, setErroDb] = useState<string | null>(null);

  const carregar = useCallback(async (termo: string) => {
    const res = await listarClientesFn({ data: { busca: termo } });
    setClientes(res.data ?? []);
    setErroDb(res.ok ? null : res.message);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void carregar(busca), 300);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  const set = (k: keyof typeof vazio, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    if (!isValidDocumento(form.documento)) {
      toast.error("CPF ou CNPJ inválido.");
      return;
    }
    setSalvando(true);
    const res = await salvarClienteFn({ data: { ...form, email: form.email || null } as never });
    setSalvando(false);
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success(form.id ? "Cliente atualizado." : "Cliente cadastrado.");
    setOpen(false);
    setForm(vazio);
    void carregar(busca);
  };

  const excluir = async (id: string) => {
    const res = await removerClienteFn({ data: { id } });
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success("Cliente excluído.");
    void carregar(busca);
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500">Cadastro com validação de CPF/CNPJ e bloqueio de duplicidade.</p>
        </div>

        {erroDb && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erroDb}</div>
        )}

        <DataTable
          title={`${clientes.length} cliente(s)`}
          data={clientes}
          onSearch={setBusca}
          onAdd={() => {
            setForm(vazio);
            setOpen(true);
          }}
          columns={[
            { header: "Nome", accessor: (r) => <span className="font-medium text-slate-900">{r['nome']}</span> },
            {
              header: "Documento",
              accessor: (r) => (
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">{formatDocumento(String(r['documento'] ?? ""))}</span>
                  <Badge variant="secondary">{r['tipo_pessoa']}</Badge>
                </div>
              ),
            },
            { header: "Telefone", accessor: (r) => r['telefone'] || r['whatsapp'] || "—" },
            { header: "Cidade", accessor: (r) => [r['cidade'], r['uf']].filter(Boolean).join(" - ") || "—" },
            {
              header: "Ações",
              accessor: (r) => (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setForm({
                        id: r['id'],
                        nome: r['nome'] ?? "",
                        documento: r['documento'] ?? "",
                        email: r['email'] ?? "",
                        telefone: r['telefone'] ?? "",
                        whatsapp: r['whatsapp'] ?? "",
                        cidade: r['cidade'] ?? "",
                        uf: r['uf'] ?? "",
                        cep: r['cep'] ?? "",
                        endereco: r['endereco'] ?? "",
                        observacoes: r['observacoes'] ?? "",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void excluir(r['id'])}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar cliente" : "Novo cliente"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Nome completo / Razão social</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CPF ou CNPJ</Label>
              <Input
                value={form.documento}
                onChange={(e) => set("documento", e.target.value)}
                placeholder="Somente números"
              />
              {form.documento && (
                <p className={`text-xs ${isValidDocumento(form.documento) ? "text-teal-700" : "text-red-600"}`}>
                  {isValidDocumento(form.documento)
                    ? `${tipoPessoa(form.documento)} válido: ${formatDocumento(form.documento)}`
                    : "Dígito verificador inválido."}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input maxLength={2} value={form.uf} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={(e) => set("cep", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </div>

          <SheetFooter>
            <Button className="w-full bg-teal-900 hover:bg-teal-950" disabled={salvando} onClick={() => void salvar()}>
              {salvando ? "Salvando..." : "Salvar cliente"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </BackofficeLayout>
  );
}