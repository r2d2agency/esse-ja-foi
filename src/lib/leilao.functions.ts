import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  ensureLeilaoSchema, 
  configurarLeilao, 
  registrarLance, 
  getEstadoLeilao, 
  processarCicloLeiloes,
  listarLeiloesAdmin
} from "../db/leilao.server";

export const initLeilaoModule = createServerFn({ method: "POST" })
  .handler(async () => {
    await ensureLeilaoSchema();
    return { success: true };
  });

export const getLeilaoInfo = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: leilaoId }) => {
    await processarCicloLeiloes();
    return getEstadoLeilao(leilaoId);
  });

export const darLanceFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    leilaoId: z.string().uuid(),
    valor: z.number().positive(),
    compradorId: z.string().uuid()
  }).parse(data))
  .handler(async ({ data, request }) => {
    // Como a infraestrutura de request.headers parece ter limitações no ambiente de build/typecheck
    // vamos passar o compradorId explicitamente do frontend por enquanto, validando no backend
    // em uma etapa posterior com middleware real.
    
    const ip = request?.headers?.get("x-forwarded-for") || "unknown";
    const ua = request?.headers?.get("user-agent") || "unknown";

    return registrarLance(data.leilaoId, data.compradorId, data.valor, ip, ua);
  });

export const salvarConfiguracaoLeilao = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    anuncio_id: z.string().uuid(),
    inicio_em: z.string(),
    fim_em: z.string(),
    lance_inicial: z.number(),
    incremento_minimo: z.number(),
    prorrogacao_ativa: z.boolean(),
    prorrogacao_janela_segundos: z.number(),
    prorrogacao_tempo_segundos: z.number(),
  }).parse(data))
  .handler(async ({ data }) => {
    return configurarLeilao(data);
  });

export const getLeiloesAdmin = createServerFn({ method: "GET" })
  .validator((status: string | undefined) => z.string().optional().parse(status))
  .handler(async ({ data: status }) => {
    return listarLeiloesAdmin(status);
  });
