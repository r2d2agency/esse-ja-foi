import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getVistoriasHojeVistoriadorFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ usuarioId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { listarVistoriasHojeVistoriador } = await import("@/db/vistorias.server");
    try {
      const vistorias = await listarVistoriasHojeVistoriador(data.usuarioId);
      return { ok: true, data: vistorias };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getVistoriaDetalheVistoriadorFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ vistoriaId: z.string(), usuarioId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { getVistoriaDetalheVistoriador } = await import("@/db/vistorias.server");
    try {
      const vistoria = await getVistoriaDetalheVistoriador(data.vistoriaId, data.usuarioId);
      return { ok: true, data: vistoria };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const iniciarCheckinFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    vistoriaId: z.string(),
    usuarioId: z.string(),
    placa: z.string(),
    localizacao: z.any()
  }).parse(d))
  .handler(async ({ data }) => {
    const { iniciarCheckin } = await import("@/db/vistorias.server");
    try {
      return await iniciarCheckin(data);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const salvarItemChecklistFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    laudoId: z.string(),
    etapa: z.string(),
    item_chave: z.string(),
    status: z.string(),
    observacao: z.string().optional(),
    foto_url: z.string().optional()
  }).parse(d))
  .handler(async ({ data }) => {
    const { salvarItemChecklist } = await import("@/db/vistorias.server");
    try {
      return await salvarItemChecklist(data);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const salvarFotoLaudoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    laudoId: z.string(),
    tipo_foto: z.string(),
    url: z.string(),
    metadata: z.any().optional()
  }).parse(d))
  .handler(async ({ data }) => {
    const { salvarFotoLaudo } = await import("@/db/vistorias.server");
    try {
      return await salvarFotoLaudo(data);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const concluirVistoriaAppFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    laudoId: z.string(),
    quilometragem: z.number(),
    observacao_geral: z.string(),
    declaracao: z.boolean()
  }).parse(d))
  .handler(async ({ data }) => {
    const { concluirVistoriaApp } = await import("@/db/vistorias.server");
    try {
      return await concluirVistoriaApp(data);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });