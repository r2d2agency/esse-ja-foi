import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row } from "@/db/cadastro.server";

const criarSchema = z.object({
  veiculoId: z.string().uuid(),
  vistoriadorId: z.string().uuid(),
  parceiroId: z.string().nullish(),
  unidade: z.string().nullish(),
  dataHora: z.string().min(10),
  duracaoMin: z.number().nullish(),
  observacao: z.string().nullish(),
  responsavelInterno: z.string().nullish(),
  usuario: z.string().nullish(),
});

const filtrosSchema = z.object({
  vistoriadorId: z.string().nullish(),
  parceiroId: z.string().nullish(),
  cidade: z.string().nullish(),
  status: z.string().nullish(),
  de: z.string().nullish(),
  ate: z.string().nullish(),
});

function falha(error: unknown) {
  const err = error as { message?: string; status?: number };
  console.error("[agendamentos]", err?.message);
  return { ok: false as const, status: err?.status ?? 500, message: err?.message ?? "Erro inesperado." };
}

export const listarVistoriadoresFn = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("@/db/agendamentos.server");
  try {
    return { ok: true as const, data: await m.listarVistoriadores() };
  } catch (e) {
    return { ...falha(e), data: [] as Array<Row> };
  }
});

export const listarParceirosFn = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("@/db/agendamentos.server");
  try {
    return { ok: true as const, data: await m.listarParceiros() };
  } catch (e) {
    return { ...falha(e), data: [] as Array<Row> };
  }
});

export const salvarParceiroFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: z.string().min(2),
        unidade: z.string().nullish(),
        cidade: z.string().nullish(),
        uf: z.string().nullish(),
        endereco: z.string().nullish(),
        telefone: z.string().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, ...(await m.salvarParceiro(data)) };
    } catch (e) {
      return falha(e);
    }
  });

export const horariosOcupadosFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ vistoriadorId: z.string().uuid(), dia: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, data: await m.horariosOcupados(data.vistoriadorId, data.dia) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const criarAgendamentoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => criarSchema.parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, ...(await m.criarAgendamento(data)) };
    } catch (e) {
      return falha(e);
    }
  });

export const listarAgendamentosFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => filtrosSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, data: await m.listarAgendamentos(data) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const agendaSemanaFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        referencia: z.string().default(""),
        vistoriadorId: z.string().nullish(),
        parceiroId: z.string().nullish(),
        cidade: z.string().nullish(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      const { referencia, ...filtros } = data;
      return { ok: true as const, data: await m.agendaSemana(referencia, filtros) };
    } catch (e) {
      return { ...falha(e), data: { inicio: "", fim: "", dias: [] as Array<{ data: string; itens: Array<Row> }> } };
    }
  });

export const meusAgendamentosFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ vistoriadorId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, data: await m.meusAgendamentos(data.vistoriadorId) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<{ data: string; itens: Array<Row> }> };
    }
  });

export const remarcarAgendamentoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        dataHora: z.string().min(10),
        motivo: z.string().min(5),
        vistoriadorId: z.string().nullish(),
        usuario: z.string().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, ...(await m.remarcarAgendamento(data)) };
    } catch (e) {
      return falha(e);
    }
  });

export const cancelarAgendamentoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), motivo: z.string().min(5), usuario: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, ...(await m.cancelarAgendamento(data)) };
    } catch (e) {
      return falha(e);
    }
  });

export const statusAgendamentoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.string(), usuario: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/agendamentos.server");
    try {
      return { ok: true as const, ...(await m.alterarStatusAgendamento(data.id, data.status, data.usuario)) };
    } catch (e) {
      return falha(e);
    }
  });
