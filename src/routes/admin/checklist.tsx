import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BackofficeLayout } from "@/components/layout/BackofficeLayout";
import {
  ativarModeloFn,
  excluirAcessorioFn,
  excluirModeloFn,
  listarModelosFn,
  obterModeloFn,
  salvarAcessorioFn,
  salvarModeloFn,
} from "@/lib/checklist.functions";
import { Plus, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/checklist")({
  head: () => ({
    meta: [
      { title: "Checklist e acessórios | ESSE JÁ FOI" },
      { name: "description", content: "Modelos de checklist versionados e catálogo de acessórios da vistoria." },
      { property: "og:title", content: "Checklist e acessórios | ESSE JÁ FOI" },
      { property: "og:description", content: "Gerencie os itens que o vistoriador preenche em campo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChecklistAdmin,
});

type Row = Record<string, any>;
type ItemForm = { categoria: string; titulo: string; tipo: string; obrigatorio: boolean; exigeFoto: boolean };

const itemVazio = (): ItemForm => ({ categoria: "GERAL", titulo: "", tipo: "OK_AVARIA", obrigatorio: true, exigeFoto: false });

function ChecklistAdmin() {
  const [modelos, setModelos] = useState<Array<Row>>([]);
  const [acessorios, setAcessorios] = useState<Array<Row>>([]);
  const [editando, setEditando] = useState<{ id?: string; codigo: string; nome: string; descricao: string; itens: Array<ItemForm> } | null>(null);
  const [novoAcessorio, setNovoAcessorio] = useState({ nome: "", categoria: "" });

  const carregar = useCallback(async () => {
    try {
      const res = await listarModelosFn();
      if (res.ok) {
        setModelos(res.data ?? []);
        setAcessorios(res.acessorios ?? []);
      } else {
        toast.error(res.message || "Erro ao carregar dados.");
      }
    } catch (err: any) {
      toast.error("Falha na comunicação com o servidor.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirNovo = () =>
    setEditando({ codigo: "PADRAO", nome: "Checklist padrão", descricao: "", itens: [itemVazio()] });

  const abrirEdicao = async (id: string) => {
    const res = await obterModeloFn({ data: { id } });
    if (!res.ok || !res.data) {
      toast.error(res.message);
      return;
    }
    const { modelo, itens } = res.data;
    setEditando({
      id: String(modelo['id']),
      codigo: String(modelo['codigo']),
      nome: String(modelo['nome']),
      descricao: String(modelo['descricao'] ?? ""),
      itens: itens.map((i) => ({
        categoria: String(i['categoria']),
        titulo: String(i['titulo']),
        tipo: String(i['tipo']),
        obrigatorio: i['obrigatorio'] === true,
        exigeFoto: i['exige_foto'] === true,
      })),
    });
  };

  const salvar = async () => {
    if (!editando) return;
    const res = await salvarModeloFn({
      data: {
        ...(editando.id ? { id: editando.id } : {}),
        codigo: editando.codigo,
        nome: editando.nome,
        descricao: editando.descricao || null,
        itens: editando.itens.filter((i) => i.titulo.trim()),
      },
    });
    if (!res.ok || !res.data) {
      toast.error(res.message);
      return;
    }
    toast.success(res.data.novaVersao ? "Modelo em uso: nova versão criada." : "Modelo salvo.");
    setEditando(null);
    void carregar();
  };

  return (
    <BackofficeLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Checklist e acessórios</h1>
            <p className="text-slate-500">Modelos versionados usados pelo app do vistoriador.</p>
          </div>
          <button onClick={abrirNovo} className="rounded-lg bg-teal-900 px-4 py-2 text-sm font-semibold text-white">
            Novo modelo
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Versão</th>
                <th className="p-3">Itens</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {modelos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nenhum modelo cadastrado.
                  </td>
                </tr>
              )}
              {modelos.map((m) => (
                <tr key={String(m['id'])} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{m['codigo']}</td>
                  <td className="p-3">{m['nome']}</td>
                  <td className="p-3">v{m['versao']}</td>
                  <td className="p-3">{m['total_itens']}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${m['ativo'] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {m['ativo'] ? "ATIVO" : "ARQUIVADO"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => void abrirEdicao(String(m['id']))} className="mr-3 text-teal-700 hover:underline">
                      Editar
                    </button>
                    {!m['ativo'] && (
                      <button
                        onClick={async () => {
                          await ativarModeloFn({ data: { id: String(m['id']) } });
                          void carregar();
                        }}
                        className="mr-3 text-slate-600 hover:underline"
                      >
                        Ativar
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const res = await excluirModeloFn({ data: { id: String(m['id']) } });
                        if (!res.ok) toast.error(res.message);
                        void carregar();
                      }}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editando && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">{editando.id ? "Editar modelo" : "Novo modelo"}</h2>
            <p className="text-xs text-slate-500">
              Editar um modelo já usado em laudos cria automaticamente uma nova versão — os laudos antigos continuam na versão original.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm">
                <span className="text-slate-600">Código</span>
                <input
                  value={editando.codigo}
                  onChange={(e) => setEditando({ ...editando, codigo: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="text-slate-600">Nome</span>
                <input
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                />
              </label>
            </div>

            <div className="space-y-2">
              {editando.itens.map((item, idx) => (
                <div key={idx} className="grid items-center gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr_1fr_auto_auto_auto]">
                  <input
                    value={item.categoria}
                    placeholder="Categoria"
                    onChange={(e) => {
                      const itens = [...editando.itens];
                      itens[idx] = { ...item, categoria: e.target.value.toUpperCase() };
                      setEditando({ ...editando, itens });
                    }}
                    className="rounded border border-slate-300 p-2 text-sm"
                  />
                  <input
                    value={item.titulo}
                    placeholder="Título do item"
                    onChange={(e) => {
                      const itens = [...editando.itens];
                      itens[idx] = { ...item, titulo: e.target.value };
                      setEditando({ ...editando, itens });
                    }}
                    className="rounded border border-slate-300 p-2 text-sm"
                  />
                  <select
                    value={item.tipo}
                    onChange={(e) => {
                      const itens = [...editando.itens];
                      itens[idx] = { ...item, tipo: e.target.value };
                      setEditando({ ...editando, itens });
                    }}
                    className="rounded border border-slate-300 p-2 text-sm"
                  >
                    <option value="OK_AVARIA">OK / Avaria</option>
                    <option value="TEXTO">Texto</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.obrigatorio}
                      onChange={(e) => {
                        const itens = [...editando.itens];
                        itens[idx] = { ...item, obrigatorio: e.target.checked };
                        setEditando({ ...editando, itens });
                      }}
                    />
                    Obrigatório
                  </label>
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.exigeFoto}
                      onChange={(e) => {
                        const itens = [...editando.itens];
                        itens[idx] = { ...item, exigeFoto: e.target.checked };
                        setEditando({ ...editando, itens });
                      }}
                    />
                    Exige foto
                  </label>
                  <button
                    onClick={() => setEditando({ ...editando, itens: editando.itens.filter((_, i) => i !== idx) })}
                    className="text-red-600"
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEditando({ ...editando, itens: [...editando.itens, itemVazio()] })}
                className="flex items-center gap-1 text-sm font-semibold text-teal-700"
              >
                <Plus className="h-4 w-4" /> Adicionar item
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => void salvar()} className="rounded-lg bg-teal-900 px-4 py-2 text-sm font-semibold text-white">
                Salvar modelo
              </button>
              <button onClick={() => setEditando(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Catálogo de acessórios</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={novoAcessorio.nome}
              onChange={(e) => setNovoAcessorio({ ...novoAcessorio, nome: e.target.value })}
              placeholder="Nome do acessório"
              className="rounded-lg border border-slate-300 p-2 text-sm"
            />
            <input
              value={novoAcessorio.categoria}
              onChange={(e) => setNovoAcessorio({ ...novoAcessorio, categoria: e.target.value })}
              placeholder="Categoria"
              className="rounded-lg border border-slate-300 p-2 text-sm"
            />
            <button
              onClick={async () => {
                const res = await salvarAcessorioFn({ data: { nome: novoAcessorio.nome, categoria: novoAcessorio.categoria || null } });
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                setNovoAcessorio({ nome: "", categoria: "" });
                void carregar();
              }}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Adicionar
            </button>
          </div>
          <ul className="grid gap-2 md:grid-cols-3">
            {acessorios.map((a) => (
              <li key={String(a['id'])} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
                <span className={a['ativo'] ? "" : "text-slate-400 line-through"}>
                  {a['nome']} {a['categoria'] ? <span className="text-slate-400">· {a['categoria']}</span> : null}
                </span>
                <button
                  onClick={async () => {
                    await excluirAcessorioFn({ data: { id: String(a['id']) } });
                    void carregar();
                  }}
                  className="text-red-600"
                  aria-label="Desativar acessório"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {acessorios.length === 0 && <li className="text-sm text-slate-500">Nenhum acessório cadastrado.</li>}
          </ul>
        </div>
      </div>
    </BackofficeLayout>
  );
}