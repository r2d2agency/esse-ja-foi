import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { DataTable } from "@/components/shared/DataTable";
import { toast } from "sonner";
import { Copy, Pencil, Play, Power, PowerOff, RefreshCw } from "lucide-react";
import { 
  listarRegrasDepreciacaoFn, 
  salvarRegraDepreciacaoFn, 
  duplicarRegraDepreciacaoFn 
} from "@/lib/admin.functions";
import { formatCurrency } from "@/lib/brasil";

export const Route = createFileRoute("/admin/depreciacao")({
  component: DepreciacaoAdminPage,
  head: () => ({
    meta: [
      { title: "Regras de Depreciação | ESSE JÁ FOI" },
      { name: "description", content: "Gerenciamento de regras de depreciação e simulador de cálculo." },
    ],
  }),
});

type Rule = {
  id: string;
  item_id: string | null;
  item_titulo: string | null;
  item_categoria: string | null;
  resposta: string | null;
  tipo_desconto: "PERCENTUAL" | "VALOR";
  valor: number;
  fator_leve: number;
  fator_media: number;
  fator_grave: number;
  ativo: boolean;
};

const emptyRule = {
  itemId: null as string | null,
  resposta: "AVARIA",
  tipoDesconto: "PERCENTUAL" as "PERCENTUAL" | "VALOR",
  valor: 0,
  fatorLeve: 0.6,
  fatorMedia: 1.0,
  fatorGrave: 1.8,
  ativo: true,
};

function DepreciacaoAdminPage() {
  const [regras, setRegras] = useState<Rule[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ id?: string } & typeof emptyRule>(emptyRule);
  const [simulacao, setSimulacao] = useState({ fipe: 50000, km: 0, ano: new Date().getFullYear(), descontos: [] as any[] });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listarRegrasDepreciacaoFn();
      if (res.ok) {
        setRegras(res.data as Rule[]);
        setItens(res.itens as any[]);
      } else {
        toast.error(res.message || "Erro ao carregar regras.");
      }
    } catch (err) {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    const res = await salvarRegraDepreciacaoFn({ data: { ...form, valor: Number(form.valor), fatorLeve: Number(form.fatorLeve), fatorMedia: Number(form.fatorMedia), fatorGrave: Number(form.fatorGrave) } });
    if (res.ok) {
      toast.success("Regra salva com sucesso");
      setOpen(false);
      void carregar();
    } else {
      toast.error(res.message);
    }
  };

  const duplicar = async (id: string) => {
    const res = await duplicarRegraDepreciacaoFn({ data: { id } });
    if (res.ok) {
      toast.success("Regra duplicada");
      void carregar();
    }
  };

  const toggleAtivo = async (rule: Rule) => {
    await salvarRegraDepreciacaoFn({ data: { 
      id: rule.id, 
      itemId: rule.item_id, 
      resposta: rule.resposta, 
      tipoDesconto: rule.tipo_desconto, 
      valor: Number(rule.valor), 
      fatorLeve: Number(rule.fator_leve), 
      fatorMedia: Number(rule.fator_media), 
      fatorGrave: Number(rule.fator_grave), 
      ativo: !rule.ativo 
    } });
    void carregar();
  };

  const rodarSimulacao = () => {
    // Simulação simplificada para o admin calibrar
    const fipe = Number(simulacao.fipe);
    const result = regras
      .filter(r => r.ativo && r.item_id)
      .map(r => {
        const desc = r.tipo_desconto === 'PERCENTUAL' ? (fipe * r.valor / 100) : r.valor;
        return { titulo: r.item_titulo, valor: desc * r.fator_media }; // Usando média como padrão na simulação
      });
    setSimulacao(s => ({ ...s, descontos: result }));
  };

  return (
    <BackofficeLayout>
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Regras de Depreciação</h1>
              <p className="text-sm text-slate-500">Configure como cada avaria impacta no valor final do veículo.</p>
            </div>
            <Button className="bg-teal-900" onClick={() => { setForm(emptyRule); setOpen(true); }}>
              Nova Regra
            </Button>
          </div>

          <DataTable<Rule>
            data={regras}
            emptyMessage={loading ? "Carregando..." : "Nenhuma regra cadastrada."}
            columns={[
              { 
                header: "Item do Checklist", 
                accessor: (r) => (
                  <div>
                    <div className="font-medium text-slate-900">{r.item_titulo || "Geral/KM"}</div>
                    <div className="text-[10px] uppercase text-slate-400">{r.item_categoria || "Parâmetro"}</div>
                  </div>
                )
              },
              { 
                header: "Base", 
                accessor: (r) => r.tipo_desconto === 'PERCENTUAL' ? `${r.valor}%` : formatCurrency(r.valor) 
              },
              { 
                header: "Fatores (L/M/G)", 
                accessor: (r) => (
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[10px]">{r.fator_leve}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.fator_media}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.fator_grave}</Badge>
                  </div>
                )
              },
              { 
                header: "Status", 
                accessor: (r) => (
                  <Badge className={r.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}>
                    {r.ativo ? "ATIVO" : "INATIVO"}
                  </Badge>
                )
              },
              {
                header: "Ações",
                accessor: (r) => (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => {
                      setForm({
                        id: r.id,
                        itemId: r.item_id,
                        resposta: r.resposta || "AVARIA",
                        tipoDesconto: r.tipo_desconto,
                        valor: Number(r.valor),
                        fatorLeve: Number(r.fator_leve),
                        fatorMedia: Number(r.fator_media),
                        fatorGrave: Number(r.fator_grave),
                        ativo: r.ativo
                      });
                      setOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void duplicar(r.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => void toggleAtivo(r)}>
                      {r.ativo ? <PowerOff className="h-4 w-4 text-red-500" /> : <Power className="h-4 w-4 text-emerald-500" />}
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <Play className="h-4 w-4 text-teal-700" /> Simulador de Cálculo
            </h2>
            <p className="mt-1 text-xs text-slate-500 text-balance">Teste as regras em tempo real para calibrar a margem.</p>
            
            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs">Valor FIPE Hipotético</Label>
                <Input 
                  type="number" 
                  value={simulacao.fipe} 
                  onChange={e => setSimulacao(s => ({ ...s, fipe: Number(e.target.value) }))}
                />
              </div>
              <Button className="w-full bg-slate-900" onClick={rodarSimulacao}>
                Calcular Resultado
              </Button>

              {simulacao.descontos.length > 0 && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  {simulacao.descontos.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-500">{d.titulo}</span>
                      <span className="font-medium text-red-600">-{formatCurrency(d.valor)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t pt-2 font-bold">
                    <span>Final Sugerido</span>
                    <span className="text-teal-900">
                      {formatCurrency(simulacao.fipe - simulacao.descontos.reduce((a, b) => a + b.valor, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form.id ? "Editar Regra" : "Nova Regra de Depreciação"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label>Item do Checklist</Label>
              <Select value={form.itemId || "null"} onValueChange={v => setForm(f => ({ ...f, itemId: v === "null" ? null : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Geral (não atrelado a item)</SelectItem>
                  {itens.map(it => (
                    <SelectItem key={it.id} value={it.id}>
                      [{it.categoria}] {it.titulo} ({it.modelo_nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipoDesconto} onValueChange={v => setForm(f => ({ ...f, tipoDesconto: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTUAL">Percentual (%)</SelectItem>
                    <SelectItem value="VALOR">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Base</Label>
                <Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <Label className="mb-2 block text-xs font-bold uppercase text-slate-500">Multiplicadores de Gravidade</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px]">Leve</Label>
                  <Input type="number" step="0.1" value={form.fatorLeve} onChange={e => setForm(f => ({ ...f, fatorLeve: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-[10px]">Média</Label>
                  <Input type="number" step="0.1" value={form.fatorMedia} onChange={e => setForm(f => ({ ...f, fatorMedia: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label className="text-[10px]">Grave</Label>
                  <Input type="number" step="0.1" value={form.fatorGrave} onChange={e => setForm(f => ({ ...f, fatorGrave: Number(e.target.value) }))} />
                </div>
              </div>
            </div>
          </div>
          <SheetFooter className="mt-8">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-teal-900" onClick={salvar}>Salvar Regra</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </BackofficeLayout>
  );
}
