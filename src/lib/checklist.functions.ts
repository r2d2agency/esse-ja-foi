import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row } from "@/db/cadastro.server";

function falha(error: unknown) {
  const err = error as { message?: string; status?: number };
  console.error("[checklist]", err?.message);
  return { ok: false as const, status: err?.status ?? 500, message: err?.message ?? "Erro inesperado." };
}

const itemSchema = z.object({
  categoria: z.string().min(1),
  titulo: z.string().min(1),
  ajuda: z.string().nullish(),
  tipo: z.string().nullish(),
  obrigatorio: z.boolean().optional(),
  exigeFoto: z.boolean().optional(),
});

export const listarModelosFn = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("@/db/checklist.server");
  try {
    const [modelos, acessorios] = await Promise.all([m.listarModelos(), m.listarAcessorios(true)]);
    return { ok: true as const, data: modelos, acessorios };
  } catch (e) {
    return { ...falha(e), data: [] as Array<Row>, acessorios: [] as Array<Row> };
  }
});

export const obterModeloFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/checklist.server");
    try {
      return { ok: true as const, data: await m.obterModelo(data.id) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const salvarModeloFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        codigo: z.string().min(2),
        nome: z.string().min(2),
        descricao: z.string().nullish(),
        itens: z.array(itemSchema).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/checklist.server");
    try {
      return { ok: true as const, data: await m.salvarModelo(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const ativarModeloFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/checklist.server");
    try {
      await m.ativarModelo(data.id);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });

export const excluirModeloFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/checklist.server");
    try {
      await m.excluirModelo(data.id);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });

export const salvarAcessorioFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().min(2),
        categoria: z.string().nullish(),
        ativo: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/checklist.server");
    try {
      return { ok: true as const, data: await m.salvarAcessorio(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const excluirAcessorioFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/checklist.server");
    try {
      await m.excluirAcessorio(data.id);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });