import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ensureNegociacoesSchema,
  fecharLeilao,
  processarFechamentos,
  listarNegociacoesAdmin,
  getNegociacao,
  getNegociacoesComprador,
  getNegociacoesVendedor,
  cancelarNegociacao,
  getIndicadoresNegociacao,
  listarLeiloesSemVenda,
  getPrazoPagamentoHoras,
  setPrazoPagamentoHoras,
} from "../db/negociacoes.server";

export const initNegociacoesModule = createServerFn({ method: "POST" }).handler(async () => {
  await ensureNegociacoesSchema();
  return { ok: true };
});

export const fecharLeilaoFn = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => {
    await ensureNegociacoesSchema();
    return fecharLeilao(data);
  });

export const processarFechamentosFn = createServerFn({ method: "POST" }).handler(async () => {
  await ensureNegociacoesSchema();
  return processarFechamentos();
});

export const listarNegociacoesAdminFn = createServerFn({ method: "GET" })
  .validator((status: string | undefined) => z.string().optional().parse(status))
  .handler(async ({ data }) => {
    await ensureNegociacoesSchema();
    await processarFechamentos();
    const [lista, indicadores, semVenda, prazoHoras] = await Promise.all([
      listarNegociacoesAdmin(data),
      getIndicadoresNegociacao(),
      listarLeiloesSemVenda(),
      getPrazoPagamentoHoras(),
    ]);
    return { lista, indicadores, semVenda, prazoHoras, servidor_agora: new Date().toISOString() } as any;
  });

export const getNegociacaoFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => {
    await ensureNegociacoesSchema();
    return (await getNegociacao(data)) as any;
  });

export const getNegociacoesCompradorFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => {
    await ensureNegociacoesSchema();
    await processarFechamentos();
    return (await getNegociacoesComprador(data)) as any;
  });

export const getNegociacoesVendedorFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => {
    await ensureNegociacoesSchema();
    return (await getNegociacoesVendedor(data)) as any;
  });

export const cancelarNegociacaoFn = createServerFn({ method: "POST" })
  .validator((data: any) =>
    z.object({
      id: z.string().uuid(),
      motivo: z.string().min(3),
      mensagem_comprador: z.string().optional(),
      mensagem_vendedor: z.string().optional(),
      admin_id: z.string().uuid(),
    }).parse(data),
  )
  .handler(async ({ data }) => cancelarNegociacao(data));

export const salvarPrazoPagamentoFn = createServerFn({ method: "POST" })
  .validator((horas: number) => z.number().int().positive().max(240).parse(horas))
  .handler(async ({ data }) => {
    await ensureNegociacoesSchema();
    return setPrazoPagamentoHoras(data);
  });
