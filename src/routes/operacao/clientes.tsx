import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Trash2 } from "lucide-react";
import { formatDocumento, isValidDocumento, onlyDigits, tipoPessoa } from "@/lib/validators";
import { buscarCep, maskCep, maskDocumento, maskTelefone } from "@/lib/brasil";
import { listarClientesFn, removerClienteFn, salvarClienteFn } from "@/lib/cadastro.functions";

export const Route = createFileRoute("/operacao/clientes")({
  component: ClientesPage,
  head: () => ({
    meta: [
      { title: "Clientes | ESSE JÁ FOI" },
      { name: "description", content: "Cadastro de clientes em passos com validação de CPF/CNPJ e busca de CEP." },
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
  cep: "",
  endereco: "",
  cidade: "",
  uf: "",
  observacoes: "",
};

const PASSOS = ["Identificação", "Contato", "Endereço"];

function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const [passo, setPasso] = useState(0);
  const [form, setForm] = useState(vazio);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroDb, setErroDb] = useState<string | null>(null);

  const carregar = useCallback(async (termo: string) => {
    const res = await listarClientesFn({ data: { busca: termo } });
    setClientes(res.data ?? []);
    setErroDb(res.ok ? null : (res as { message: string }).message);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void carregar(busca), 300);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  const set = (k: keyof typeof vazio, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const tipo = tipoPessoa(form.documento);
  const documentoValido = isValidDocumento(form.documento);

  const podeAvancar = useMemo(() => {
    if (passo === 0) return form.nome.trim().length >= 3 && documentoValido;
    if (passo === 1) return onlyDigits(form.whatsapp || form.telefone).length >= 10;
    return true;
  }, [passo, form, documentoValido]);

  const abrirNovo = () => {
    setForm(vazio);
    setPasso(0);
    setOpen(true);
  };

  const editar = (c: Cliente) => {
    setForm({
      id: c['id'],
      nome: c['nome'] ?? "",
      documento: maskDocumento(String(c['documento'] ?? "")),
      email: c['email'] ?? "",
      telefone: maskTelefone(String(c['telefone'] ?? "")),
      whatsapp: maskTelefone(String(c['whatsapp'] ?? "")),
      cep: maskCep(String(c['cep'] ?? "")),
      endereco: c['endereco'] ?? "",
      cidade: c['cidade'] ?? "",
      uf: c['uf'] ?? "",
      observacoes: c['observacoes'] ?? "",
    });
    setPasso(0);
    setOpen(true);
  };

  const preencherPorCep = async (valor: string) => {
    set("cep", maskCep(valor));
    if (onlyDigits(valor).length !== 8) return;
    setBuscandoCep(true);
    const endereco = await buscarCep(valor);
    setBuscandoCep(false);
    if (!endereco) {
      toast.error("CEP não encontrado.");
      return;
    }
    setForm((f) => ({
      ...f,
      cep: endereco.cep,
      endereco: [endereco.logradouro, endereco.bairro].filter(Boolean).join(" - "),
      cidade: endereco.cidade,
      uf: endereco.uf,
    }));
  };

  const salvar = async () => {
    if (!documentoValido) {
      toast.error("CPF ou CNPJ inválido.");
      setPasso(0);
      return;
    }
    setSalvando(true);
    const res = await salvarClienteFn({
      data: {
        ...form,
        documento: onlyDigits(form.documento),
        email: form.email || null,
      } as never,
    });
    setSalvando(false);
    if (!res.ok) {
      toast.error((res as { message: string }).message);
      return;
    }
    toast.success(form.id ? "Cliente atualizado." : "Cliente cadastrado.");
    setOpen(false);
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
          <p className="text-sm text-slate-500">Cadastro em passos com validação de documento e busca de CEP.</p>
        </div>

        {erroDb && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{erroDb}</div>
        )}

        <DataTable<Cliente>
          data={clientes}
          onSearch={setBusca}
          onAdd={abrirNovo}
          emptyMessage="Nenhum cliente cadastrado ainda."
          columns={[
            { header: "Nome", accessor: (c) => <span className="font-medium text-slate-900">{c['nome']}</span> },
            { header: "Documento", accessor: (c) => formatDocumento(String(c['documento'] ?? "")) },
            {
              header: "Tipo",
              accessor: (c) => <Badge variant="secondary">{c['tipo_pessoa'] ?? "-"}</Badge>,
            },
            { header: "WhatsApp", accessor: (c) => maskTelefone(String(c['whatsapp'] ?? c['telefone'] ?? "")) || "-" },
            { header: "Cidade", accessor: (c) => [c['cidade'], c['uf']].filter(Boolean).join("/") || "-" },
            {
              header: "Ações",
              accessor: (c) => (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => editar(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => void excluir(String(c['id']))}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar cliente" : "Novo cliente"}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 flex items-center gap-2">
            {PASSOS.map((nome, i) => (
              <div key={nome} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i < passo ? "bg-teal-900 text-white" : i === passo ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i < passo ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs ${i === passo ? "font-semibold text-slate-900" : "text-slate-500"}`}>{nome}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            {passo === 0 && (
              <>
                <div>
                  <Label>Nome / Razão social</Label>
                  <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <Label>CPF / CNPJ</Label>
                  <Input
                    value={form.documento}
                    onChange={(e) => set("documento", maskDocumento(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                  <div className="mt-1 text-xs">
                    {form.documento === "" ? (
                      <span className="text-slate-500">Informe CPF (11 dígitos) ou CNPJ (14 dígitos).</span>
                    ) : documentoValido ? (
                      <span className="text-emerald-600">Documento válido — pessoa {tipo === "PJ" ? "jurídica" : "física"}.</span>
                    ) : (
                      <span className="text-red-600">Documento inválido (dígito verificador).</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
                </div>
              </>
            )}

            {passo === 1 && (
              <>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => set("whatsapp", maskTelefone(e.target.value))} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => set("telefone", maskTelefone(e.target.value))} placeholder="(11) 3333-3333" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" />
                </div>
              </>
            )}

            {passo === 2 && (
              <>
                <div>
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input value={form.cep} onChange={(e) => void preencherPorCep(e.target.value)} placeholder="00000-000" />
                    {buscandoCep && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Endereço preenchido automaticamente pelo ViaCEP.</p>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Cidade</Label>
                    <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                  </div>
                  <div>
                    <Label>UF</Label>
                    <Input value={form.uf} maxLength={2} onChange={(e) => set("uf", e.target.value.toUpperCase())} />
                  </div>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="mt-6 flex-row justify-between gap-2">
            <Button variant="outline" onClick={() => (passo === 0 ? setOpen(false) : setPasso(passo - 1))}>
              {passo === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {passo < PASSOS.length - 1 ? (
              <Button className="bg-teal-900 hover:bg-teal-950" disabled={!podeAvancar} onClick={() => setPasso(passo + 1)}>
                Continuar
              </Button>
            ) : (
              <Button className="bg-teal-900 hover:bg-teal-950" disabled={salvando} onClick={() => void salvar()}>
                {salvando ? "Salvando..." : "Salvar cliente"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </BackofficeLayout>
  );
}
