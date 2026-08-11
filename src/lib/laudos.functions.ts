import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row } from "@/db/cadastro.server";
import type { Pendencia } from "@/db/laudos.server";

function falha(error: unknown) {
  const err = error as { message?: string; status?: number; pendencias?: Array<Pendencia> };
  console.error("[laudos]", err?.message);
  return {
    ok: false as const,
    status: err?.status ?? 500,
    message: err?.message ?? "Erro inesperado.",
    pendencias: err?.pendencias ?? ([] as Array<Pendencia>),
  };
}

export const detalheAgendamentoFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), vistoriadorId: z.string().uuid().nullish() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.detalheAgendamento(data.id, data.vistoriadorId ?? null) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const criarLaudoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ agendamentoId: z.string().uuid(), vistoriadorId: z.string().uuid(), placaConfirmada: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.criarLaudo(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const obterLaudoFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), vistoriadorId: z.string().uuid().nullish() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.obterLaudo(data.id, data.vistoriadorId ?? null) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const salvarRespostaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        laudoId: z.string().uuid(),
        itemId: z.string().uuid(),
        resposta: z.string().nullish(),
        gravidade: z.string().nullish(),
        observacao: z.string().nullish(),
        valorNum: z.number().nullish(),
        vistoriadorId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.salvarResposta(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const salvarFotoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        laudoId: z.string().uuid(),
        itemId: z.string().uuid().nullish(),
        chave: z.string().min(1),
        url: z.string().nullish(),
        legenda: z.string().nullish(),
        vistoriadorId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.salvarFoto(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const removerFotoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ laudoId: z.string().uuid(), fotoId: z.string().uuid(), vistoriadorId: z.string().uuid().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      await m.removerFoto(data);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });

export const salvarAcessoriosLaudoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        laudoId: z.string().uuid(),
        itens: z.array(z.object({ acessorioId: z.string().uuid(), estado: z.string() })),
        vistoriadorId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      await m.salvarAcessoriosLaudo(data);
      return { ok: true as const };
    } catch (e) {
      return falha(e);
    }
  });

export const validarPlacaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        laudoId: z.string().uuid().nullish(),
        agendamentoId: z.string().uuid().nullish(),
        placa: z.string().min(5),
        vistoriadorId: z.string().uuid().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      const res = await m.validarPlaca(data);
      return { ...res, erro: false as const };
    } catch (e) {
      return { ...falha(e), confere: false as const, erro: true as const, esperada: "", informada: "" };
    }
  });

export const registrarDivergenciaFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        agendamentoId: z.string().uuid(),
        placaInformada: z.string().min(5),
        vistoriadorId: z.string().uuid(),
        observacao: z.string().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      const res = await m.registrarDivergenciaPlaca(data);
      return { ok: true as const, mensagem: res.mensagem };
    } catch (e) {
      return { ...falha(e), mensagem: "" };
    }
  });

export const enviarLaudoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ laudoId: z.string().uuid(), vistoriadorId: z.string().uuid().nullish() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.enviarLaudo(data), pendencias: [] as Array<Pendencia> };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const pendenciasLaudoFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ laudoId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.pendenciasLaudo(data.laudoId) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Pendencia> };
    }
  });

export const devolverLaudoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ laudoId: z.string().uuid(), motivo: z.string().min(3), usuario: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.devolverLaudo(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const listarLaudosFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ status: z.string().nullish(), vistoriadorId: z.string().nullish() }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const m = await import("@/db/laudos.server");
    try {
      return { ok: true as const, data: await m.listarLaudos(data) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });