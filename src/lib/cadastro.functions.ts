import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row } from "@/db/cadastro.server";

const clienteSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(3),
  documento: z.string().min(11),
  email: z.string().email().nullish().or(z.literal("")),
  telefone: z.string().nullish(),
  whatsapp: z.string().nullish(),
  cidade: z.string().nullish(),
  uf: z.string().nullish(),
  cep: z.string().nullish(),
  endereco: z.string().nullish(),
  observacoes: z.string().nullish(),
});

const veiculoSchema = z.object({
  id: z.string().uuid().optional(),
  placa: z.string().min(7),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  versao: z.string().nullish(),
  cor: z.string().nullish(),
  km: z.number().nullish(),
  anoFabricacao: z.string().nullish(),
  anoModelo: z.string().nullish(),
  combustivel: z.string().nullish(),
  cambio: z.string().nullish(),
  clienteId: z.string().nullish(),
  valorFipe: z.number().nullish(),
  valorInteresseCliente: z.number().nullish(),
  tipoExpectativa: z.string().nullish(),
  cienteExpectativa: z.boolean().optional(),
  cep: z.string().nullish(),
  endereco: z.string().nullish(),
  cidade: z.string().nullish(),
  uf: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  observacoes: z.string().nullish(),
});

function falha(error: unknown) {
  const err = error as { message?: string; status?: number };
  console.error("[cadastro]", err?.message);
  return { ok: false as const, status: err?.status ?? 500, message: err?.message ?? "Erro inesperado." };
}

export const listarClientesFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ busca: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      return { ok: true as const, data: await m.listarClientes(data.busca) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const salvarClienteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => clienteSchema.parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      return { ok: true as const, ...(await m.salvarCliente(data as never)) };
    } catch (e) {
      return falha(e);
    }
  });

export const removerClienteFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      await m.removerCliente(data.id);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });

export const listarVeiculosFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.string().nullish(),
        cidade: z.string().nullish(),
        clienteId: z.string().nullish(),
        busca: z.string().nullish(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      return { ok: true as const, data: await m.listarVeiculos(data) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const salvarVeiculoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => veiculoSchema.parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      return { ok: true as const, ...(await m.salvarVeiculo(data as never)) };
    } catch (e) {
      return falha(e);
    }
  });

export const alterarStatusVeiculoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.string(), usuario: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      return { ok: true as const, ...(await m.alterarStatusVeiculo(data.id, data.status, data.usuario ?? undefined)) };
    } catch (e) {
      return falha(e);
    }
  });

export const timelineVeiculoFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      return { ok: true as const, data: await m.timelineVeiculo(data.id) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const removerVeiculoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/cadastro.server");
    try {
      await m.removerVeiculo(data.id);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });