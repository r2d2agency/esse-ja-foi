import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row } from "@/db/leads.server";

function falha(error: unknown) {
  const err = error as { message?: string; status?: number };
  console.error("[leads]", err?.message);
  return { ok: false as const, status: err?.status ?? 500, message: err?.message ?? "Erro inesperado." };
}

const leadPublicoSchema = z.object({
  nome: z.string().min(3),
  whatsapp: z.string().min(10),
  cidade: z.string().nullish(),
  marca: z.string().nullish(),
  modelo: z.string().nullish(),
  ano: z.string().nullish(),
  mensagem: z.string().nullish(),
  origem: z.string().nullish(),
  utmSource: z.string().nullish(),
  utmMedium: z.string().nullish(),
  utmCampaign: z.string().nullish(),
});

export const criarLeadPublicoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => leadPublicoSchema.parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/leads.server");
    try {
      return { ok: true as const, data: await m.criarLeadPublico(data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const listarLeadsFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.string().nullish(),
        origem: z.string().nullish(),
        cidade: z.string().nullish(),
        responsavel: z.string().nullish(),
        data: z.string().nullish(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/leads.server");
    try {
      const [lista, indicadores] = await Promise.all([m.listarLeads(data), m.indicadoresLeads()]);
      return { ok: true as const, data: lista, indicadores };
    } catch (e) {
      return {
        ...falha(e),
        data: [] as Array<Row>,
        indicadores: { novos: 0, emAtendimento: 0, agendados: 0, convertidos: 0, total: 0, taxaConversao: 0 },
      };
    }
  });

export const historicoLeadFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/leads.server");
    try {
      return { ok: true as const, data: await m.historicoLead(data.id) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const registrarInteracaoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), acao: z.string().min(2), usuario: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/leads.server");
    try {
      return { ok: true as const, data: await m.registrarInteracao(data.id, data.acao, data.usuario ?? undefined) };
    } catch (e) {
      return { ...falha(e), data: [] as Array<Row> };
    }
  });

export const atualizarLeadFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.string().nullish(), responsavel: z.string().nullish() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/leads.server");
    try {
      return { ok: true as const, data: await m.atualizarLead(data.id, data) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });

export const converterLeadFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/leads.server");
    try {
      return { ok: true as const, data: await m.converterLeadEmCliente(data.id) };
    } catch (e) {
      return { ...falha(e), data: null };
    }
  });
