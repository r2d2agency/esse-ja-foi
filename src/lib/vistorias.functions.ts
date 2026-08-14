import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getVistoriasAdminFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ status: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { listarVistoriasAdmin } = await import("@/db/vistorias.server");
    try {
      const vistorias = await listarVistoriasAdmin(data);
      return { ok: true, data: vistorias };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getVeiculosAguardandoVistoriaFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { getVeiculosAguardandoVistoria } = await import("@/db/vistorias.server");
    try {
      const veiculos = await getVeiculosAguardandoVistoria();
      return { ok: true, data: veiculos };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getUnidadesDisponiveisFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ cidade: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { listarUnidadesDisponiveis } = await import("@/db/vistorias.server");
    try {
      const unidades = await listarUnidadesDisponiveis(data.cidade);
      return { ok: true, data: unidades };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getVistoriadoresUnidadeFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ unidadeId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { listarVistoriadoresUnidade } = await import("@/db/vistorias.server");
    try {
      const vistoriadores = await listarVistoriadoresUnidade(data.unidadeId);
      return { ok: true, data: vistoriadores };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const criarAgendamentoVistoriaFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    veiculo_id: z.string(),
    vendedor_id: z.string(),
    unidade_id: z.string(),
    vistoriador_id: z.string().optional().nullable(),
    data_vistoria: z.string(),
    horario_vistoria: z.string(),
    usuario_id: z.string()
  }).parse(d))
  .handler(async ({ data }) => {
    const { criarAgendamento } = await import("@/db/vistorias.server");
    try {
      return await criarAgendamento(data);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getVistoriaVendedorFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ vendedorId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { getVistoriaVendedor } = await import("@/db/vistorias.server");
    try {
      const vistoria = await getVistoriaVendedor(data.vendedorId);
      return { ok: true, data: vistoria };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const confirmarPresencaVistoriaFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ vistoriaId: z.string(), vendedorId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { confirmarVistoriaVendedor } = await import("@/db/vistorias.server");
    try {
      return await confirmarVistoriaVendedor(data.vistoriaId, data.vendedorId);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });
