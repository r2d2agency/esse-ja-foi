import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ensurePagamentosSchema,
  obterOuCriarCobranca,
  verificarPagamento,
  expirarCobrancasVencidas,
  listarPagamentosAdmin,
  getPagamento,
  getPagamentoDaNegociacao,
  gerarNovaCobranca,
  prorrogarPrazoPagamento,
  getIndicadoresPagamentos,
  getComprovante,
  confirmarPagamentoManual,
} from "../db/pagamentos.server";

export const iniciarPagamentoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ negociacao_id: z.string().uuid(), comprador_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    await ensurePagamentosSchema();
    return (await obterOuCriarCobranca(data.negociacao_id, data.comprador_id)) as any;
  });

export const verificarPagamentoFn = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => verificarPagamento(data));

export const listarPagamentosAdminFn = createServerFn({ method: "GET" })
  .validator((status: string | undefined) => z.string().optional().parse(status))
  .handler(async ({ data }) => {
    await ensurePagamentosSchema();
    const [lista, indicadores] = await Promise.all([listarPagamentosAdmin(data), getIndicadoresPagamentos()]);
    return { lista, indicadores, servidor_agora: new Date().toISOString() } as any;
  });

export const getPagamentoFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => (await getPagamento(data)) as any);

export const getPagamentoDaNegociacaoFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data }) => {
    await ensurePagamentosSchema();
    return (await getPagamentoDaNegociacao(data)) as any;
  });

export const gerarNovaCobrancaFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ negociacao_id: z.string().uuid(), motivo: z.string().min(3), admin_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => (await gerarNovaCobranca(data)) as any);

export const prorrogarPrazoPagamentoFn = createServerFn({ method: "POST" })
  .validator((data: any) =>
    z.object({ negociacao_id: z.string().uuid(), horas: z.number().int().positive().max(240), motivo: z.string().min(3), admin_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => prorrogarPrazoPagamento(data));

export const getComprovanteFn = createServerFn({ method: "GET" })
  .validator((data: any) => z.object({ cobranca_id: z.string().uuid(), comprador_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => (await getComprovante(data.cobranca_id, data.comprador_id)) as any);

export const expirarCobrancasFn = createServerFn({ method: "POST" }).handler(async () => {
  await ensurePagamentosSchema();
  return expirarCobrancasVencidas();
});

export const confirmarPagamentoManualFn = createServerFn({ method: "POST" })
  .validator((data: any) => 
    z.object({
      negociacao_id: z.string().uuid(),
      valor: z.number().positive(),
      referencia: z.string().min(3),
      admin_id: z.string().uuid()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    await ensurePagamentosSchema();
    return await confirmarPagamentoManual(data);
  });
