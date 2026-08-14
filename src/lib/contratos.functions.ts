import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const uuid = z.string().uuid();

export const listarContratosFn = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        status: z.string().optional(),
        busca: z.string().optional(),
        responsavelId: z.string().optional(),
        modeloId: z.string().optional(),
        data: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      const [lista, modelos] = await Promise.all([
        m.listarContratos({
          status: data.status,
          busca: data.busca,
          responsavelId: data.responsavelId || undefined,
          modeloId: data.modeloId || undefined,
          data: data.data || undefined,
        }),
        m.listarModelos(),
      ]);
      return { ok: true as const, data: lista, modelos };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const obterContratoFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return { ok: true as const, data: await m.obterContrato(data.id) };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const contratoDoVendedorFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ vendedorId: uuid }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return { ok: true as const, data: await m.obterContratoVendedor(data.vendedorId) };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const prepararGeracaoFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ vendedorId: uuid }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return { ok: true as const, data: await m.prepararGeracao(data.vendedorId) };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const gerarContratoFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ vendedorId: uuid, modeloId: uuid, autorId: z.string().optional(), autorNome: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return await m.gerarContrato({
        vendedorId: data.vendedorId,
        modeloId: data.modeloId,
        autorId: data.autorId || null,
        autorNome: data.autorNome || null,
      });
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const enviarContratoFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({ contratoId: uuid, canais: z.array(z.string()).default([]), autorId: z.string().optional(), autorNome: z.string().optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return await m.enviarContrato({
        contratoId: data.contratoId,
        canais: data.canais,
        autorId: data.autorId || null,
        autorNome: data.autorNome || null,
      });
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const marcarContratoVisualizadoFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ contratoId: uuid }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return await m.marcarVisualizado(data.contratoId);
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const registrarRetornoAssinaturaFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        contratoId: uuid,
        evento: z.enum(["ENVIADO", "VISUALIZADO", "ASSINADO", "RECUSADO", "EXPIRADO"]),
        provedor: z.string().optional(),
        transacaoId: z.string().optional(),
        arquivoAssinadoUrl: z.string().optional(),
        comentario: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return await m.registrarRetornoAssinatura({
        contratoId: data.contratoId,
        evento: data.evento,
        provedor: data.provedor ?? "MANUAL",
        transacaoId: data.transacaoId ?? null,
        arquivoAssinadoUrl: data.arquivoAssinadoUrl ?? null,
        comentario: data.comentario ?? null,
      });
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const cancelarContratoFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({ contratoId: uuid, motivo: z.string().min(3), observacao: z.string().optional(), autorId: z.string().optional(), autorNome: z.string().optional() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return await m.cancelarContrato({
        contratoId: data.contratoId,
        motivo: data.motivo,
        observacao: data.observacao ?? null,
        autorId: data.autorId || null,
        autorNome: data.autorNome || null,
      });
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const notificacoesContratosFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ destino: z.enum(["ADMIN", "VENDEDOR"]) }).parse(d ?? { destino: "ADMIN" }))
  .handler(async ({ data }) => {
    const m = await import("@/db/contratos.server");
    try {
      return { ok: true as const, data: await m.listarNotificacoesContratos(data.destino) };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });
