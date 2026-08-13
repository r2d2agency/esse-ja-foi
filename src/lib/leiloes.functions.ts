import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  listarLeiloesAtivos, 
  obterDetalhesLeilao, 
  registrarLance 
} from "./leiloes.server";

export const listarLeiloesAtivosFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return listarLeiloesAtivos();
  });

export const obterDetalhesLeilaoFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    return obterDetalhesLeilao(data.id);
  });

export const registrarLanceFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ 
    leilaoId: z.string(), 
    valor: z.string() 
  }).parse(d))
  .handler(async ({ data, request }) => {
    // A autenticação e o userId virão do middleware futuramente, 
    // por enquanto simulamos ou buscamos do context se disponível
    return registrarLance(data.leilaoId, data.valor);
  });
