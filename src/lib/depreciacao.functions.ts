import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  calcularDepreciacao, 
  obterHistoricoDepreciacao 
} from "../db/depreciacao.server";

export const calcularDepreciacaoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ 
    veiculoId: z.string(),
    usuarioId: z.string().optional().nullable()
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const res = await calcularDepreciacao(data.veiculoId, data.usuarioId);
      return { ok: true, data: res };
    } catch (e: any) {
      return { ok: false, message: e.message || "Erro ao calcular depreciação" };
    }
  });

export const obterHistoricoDepreciacaoFn = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ veiculoId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const res = await obterHistoricoDepreciacao(data.veiculoId);
      return { ok: true, data: res };
    } catch (e: any) {
      return { ok: false, message: e.message || "Erro ao obter histórico" };
    }
  });
