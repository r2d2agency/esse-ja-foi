import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarVendedoresFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ 
    status: z.string().optional(), 
    busca: z.string().optional() 
  }).parse(d))
  .handler(async ({ data }) => {
    const { listarVendedores } = await import("@/db/vendedores-compliance.server");
    return { 
      ok: true, 
      data: await listarVendedores({
        status: data.status,
        busca: data.busca
      }) 
    };
  });

export const obterDetalheVendedorFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { obterDetalheVendedor } = await import("@/db/vendedores-compliance.server");
    try {
      return { ok: true as const, data: await obterDetalheVendedor(data.id) };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const assumirAnaliseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ vendedorId: z.string().uuid(), responsavelId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { assumirAnalise } = await import("@/db/vendedores-compliance.server");
    try {
      return await assumirAnalise(data.vendedorId, data.responsavelId);
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });

export const atualizarStatusDocumentoFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ 
    vendedorId: z.string().uuid(), 
    documentoTipo: z.string(), 
    status: z.string(),
    autorId: z.string().uuid()
  }).parse(d))
  .handler(async ({ data }) => {
    const { atualizarStatusDocumento } = await import("@/db/vendedores-compliance.server");
    try {
      return await atualizarStatusDocumento(data.vendedorId, data.documentoTipo, data.status, data.autorId);
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });

