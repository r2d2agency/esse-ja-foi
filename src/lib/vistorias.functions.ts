import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getVistoriasAdminFn = createServerFn({ method: "GET" })
  .validator((d) => z.object({ status: z.string().optional() }).parse(d))
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
  .validator((d) => z.object({ cidade: z.string().optional() }).parse(d))
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
  .validator((d) => z.object({ unidadeId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { listarVistoriadoresUnidade } = await import("@/db/vistorias.server");
    try {
      const vistoriadores = await listarVistoriadoresUnidade(data.unidadeId);
      return { ok: true, data: vistoriadores };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getUnidadesCadastroFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { listarUnidadesVistoriaCadastro } = await import("@/db/vistorias.server");
    try {
      const unidades = await listarUnidadesVistoriaCadastro();
      return { ok: true, data: unidades };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const salvarUnidadeCadastroFn = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    id: z.string().optional(),
    nome: z.string().min(2),
    cnpj: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    endereco: z.string().min(5),
    cidade: z.string().min(2),
    estado: z.string().min(2).max(2),
    telefone: z.string().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    responsavel: z.string().optional().nullable(),
    ativo: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { salvarUnidadeVistoria } = await import("@/db/vistorias.server");
    try {
      const unidade = await salvarUnidadeVistoria(data);
      return { ok: true, data: unidade };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const getVistoriadoresCadastroFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { listarVistoriadoresCadastro } = await import("@/db/vistorias.server");
    try {
      const vistoriadores = await listarVistoriadoresCadastro();
      return { ok: true, data: vistoriadores };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const salvarVistoriadorCadastroFn = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    usuario_id: z.string(),
    unidade_id: z.string(),
    status: z.enum(["ATIVO", "INATIVO", "BLOQUEADO"]).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { salvarVistoriadorCadastro } = await import("@/db/vistorias.server");
    try {
      const vistoriador = await salvarVistoriadorCadastro(data);
      return { ok: true, data: vistoriador };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });

export const criarAgendamentoVistoriaFn = createServerFn({ method: "POST" })
  .validator((d) => z.object({
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
  .validator((d) => z.object({ vendedorId: z.string() }).parse(d))
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
  .validator((d) => z.object({ vistoriaId: z.string(), vendedorId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { confirmarVistoriaVendedor } = await import("@/db/vistorias.server");
    try {
      return await confirmarVistoriaVendedor(data.vistoriaId, data.vendedorId);
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  });
