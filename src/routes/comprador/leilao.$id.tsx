import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import { obterDetalhesLeilaoFn, registrarLanceFn } from "@/lib/leiloes.functions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Gavel, Clock, TrendingUp, ArrowLeft, History, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/comprador/leilao/$id")({
  component: LeilaoDetalhes,
});

function LeilaoDetalhes() {
  const { id } = useParams({ from: "/comprador/leilao/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [valorLance, setValorLance] = useState("");
  
  const obterDetalhes = useServerFn(obterDetalhesLeilaoFn);
  const enviarLance = useServerFn(registrarLanceFn);

  const { data: res, isLoading } = useQuery({
    queryKey: ["leilao", id],
    queryFn: () => obterDetalhes({ data: { id } }),
    refetchInterval: 5000, // Atualiza a cada 5 segundos para simular real-time
  });

  const leilao = res?.data as any;
  const lances = (leilao?.lances ?? []) as any[];
  const lanceAtual = Number(lances[0]?.valor ?? leilao?.lance_inicial ?? 0);

  const mutation = useMutation({
    mutationFn: (valor: string) => enviarLance({ data: { leilaoId: id, valor } }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Lance enviado com sucesso!");
        setValorLance("");
        queryClient.invalidateQueries({ queryKey: ["leilao", id] });
      } else {
        toast.error(res.message);
      }
    },
    onError: () => {
      toast.error("Erro ao enviar lance. Tente novamente.");
    }
  });

  const handleLance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorLance || Number(valorLance) <= lanceAtual) {
      toast.error("O lance deve ser superior ao valor atual.");
      return;
    }
    mutation.mutate(valorLance);
  };

  if (isLoading) {
    return (
      <BackofficeLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-[400px] lg:col-span-2" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </BackofficeLayout>
    );
  }

  if (!leilao) {
    return (
      <BackofficeLayout>
        <div className="text-center py-20">
          <h2 className="text-xl font-bold">Leilão não encontrado</h2>
          <Button variant="link" onClick={() => navigate({ to: "/comprador" })}>
            Voltar para leilões
          </Button>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <button
          onClick={() => navigate({ to: "/comprador" })}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-teal-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Leilões
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {leilao.marca} {leilao.modelo}
            </h1>
            <p className="text-slate-500 font-mono">{leilao.placa} · {leilao.ano_fabricacao}/{leilao.ano_modelo}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase">Encerramento</p>
              <p className="text-sm font-bold text-slate-900">{formatDate(leilao.fim_em)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 relative overflow-hidden group">
              <Gavel className="h-20 w-20 text-slate-200" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-700" /> Detalhes do Veículo
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { label: "Marca", value: leilao.marca },
                  { label: "Modelo", value: leilao.modelo },
                  { label: "Placa", value: leilao.placa },
                  { label: "Ano", value: `${leilao.ano_fabricacao}/${leilao.ano_modelo}` },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-slate-500 font-medium mb-1">{item.label}</p>
                    <p className="font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-teal-900 text-white rounded-2xl p-6 shadow-xl">
              <p className="text-sm font-medium text-teal-200 mb-1">Lance Atual</p>
              <h3 className="text-4xl font-bold mb-6">{formatCurrency(lanceAtual)}</h3>
              
              <form onSubmit={handleLance} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-teal-200 uppercase">Novo Lance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-teal-400 font-bold">R$</span>
                    <Input
                      type="number"
                      placeholder={String(lanceAtual + 500)}
                      className="bg-teal-800 border-teal-700 text-white placeholder:text-teal-600 pl-10 h-12 text-lg focus:ring-amber-500"
                      value={valorLance}
                      onChange={(e) => setValorLance(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-teal-950 font-bold text-lg rounded-xl"
                >
                  {mutation.isPending ? "Processando..." : "Dar Lance Agora"}
                </Button>
                <p className="text-[10px] text-center text-teal-400">
                  Ao dar um lance, você assume compromisso de compra.
                </p>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-400" /> Histórico
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Últimos 10</span>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {lances.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhum lance realizado.
                  </div>
                ) : (
                  lances.map((lance, i) => (
                    <div key={lance.id} className={`p-4 flex items-center justify-between border-b border-slate-50 ${i === 0 ? 'bg-teal-50/50' : ''}`}>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(lance.valor))}</p>
                        <p className="text-[10px] text-slate-400">{lance.comprador_email.split('@')[0]}***</p>
                      </div>
                      <p className="text-[10px] text-slate-400">{formatDate(lance.criado_em)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackofficeLayout>
  );
}
