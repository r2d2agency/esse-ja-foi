import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarVendedoresFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({
    status: z.string().optional(),
    busca: z.string().optional()
  }).parse(d))
  .handler(async ({ data }) => {
    const { listarVendedores } = await import("@/db/vendedores-compliance.server");
    try {
      const vendedores = await listarVendedores(data);
      return { ok: true as const, data: vendedores };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const obterDetalheVendedorFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { obterDetalheVendedor } = await import("@/db/vendedores-compliance.server");
    try {
      const vendedor = await obterDetalheVendedor(data.id);
      return { ok: true as const, data: vendedor };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const assumirAnaliseFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    vendedorId: z.string(),
    responsavelId: z.string()
  }).parse(d))
  .handler(async ({ data }) => {
    const { assumirAnalise } = await import("@/db/vendedores-compliance.server");
    try {
      await assumirAnalise(data.vendedorId, data.responsavelId);
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const atualizarStatusDocumentoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    vendedorId: z.string(),
    documentoTipo: z.string(),
    status: z.string(),
    autorId: z.string(),
    motivo: z.string().optional(),
    observacao: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { atualizarStatusDocumento } = await import("@/db/vendedores-compliance.server");
    try {
      await atualizarStatusDocumento(
        data.vendedorId,
        data.documentoTipo,
        data.status,
        data.autorId,
        data.motivo,
        data.observacao,
      );
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const aprovarVendedorComplianceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    vendedorId: z.string(),
    autorId: z.string()
  }).parse(d))
  .handler(async ({ data }) => {
    const { aprovarVendedorCompliance } = await import("@/db/vendedores-compliance.server");
    try {
      await aprovarVendedorCompliance(data.vendedorId, data.autorId);
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const solicitarPendenciaComplianceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    vendedorId: z.string(),
    autorId: z.string(),
    motivo: z.string()
  }).parse(d))
  .handler(async ({ data }) => {
    const { solicitarPendenciaCompliance } = await import("@/db/vendedores-compliance.server");
    try {
      await solicitarPendenciaCompliance(data.vendedorId, data.autorId, data.motivo);
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });
