import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarLeiloesAtivosFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { listarLeiloesAtivos } = await import("@/db/leiloes.server");
    return listarLeiloesAtivos();
  });

export const obterDetalhesLeilaoFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { obterDetalhesLeilao } = await import("@/db/leiloes.server");
    return obterDetalhesLeilao(data.id);
  });

export const registrarLanceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ 
    leilaoId: z.string(), 
    valor: z.string() 
  }).parse(d))
  .handler(async ({ data }) => {
    const { registrarLance } = await import("@/db/leiloes.server");
    // A autenticação e o userId virão do middleware futuramente
    return registrarLance(data.leilaoId, data.valor);
  });
