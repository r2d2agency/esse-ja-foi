import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db/index";
import { sql } from "drizzle-orm";
import { 
  calcularDepreciacao, 
  obterHistoricoDepreciacao 
} from "../db/depreciacao.server";

export const calcularDepreciacaoFn = createServerFn({ method: "POST" })
  .validator((d) => z.object({ 
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
  .validator((d) => z.object({ veiculoId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const res = await obterHistoricoDepreciacao(data.veiculoId);
      return { ok: true, data: res };
    } catch (e: any) {
      return { ok: false, message: e.message || "Erro ao obter histórico" };
    }
  });

export const sobrescreverAjusteFn = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    calculoId: z.string(),
    titulo: z.string(),
    novoValor: z.number(),
    justificativa: z.string().min(5, "Justificativa muito curta")
  }).parse(d))
  .handler(async ({ data }) => {
    try {
      const d = db!;
      const rows = (await d.execute(sql`SELECT detalhamento, valor_final FROM depreciacao_calculos WHERE id = ${data.calculoId}::uuid`)) as any[];
      if (!rows[0]) throw new Error("Cálculo não encontrado");
      
      const calculo = rows[0];
      const detalhamento = calculo.detalhamento;
      let valorFinal = Number(calculo.valor_final);
      
      const item = detalhamento.find((it: any) => it.titulo === data.titulo);
      if (item) {
        const diff = data.novoValor - item.valor;
        // Se for desconto, aumentar o valor retira do desconto final
        // Mas o detalhamento armazena o VALOR do desconto. 
        // Vamos simplificar: recalculamos o valor_final baseado na diferença do ajuste específico
        if (item.tipo === 'DESCONTO') {
           valorFinal = valorFinal - (data.novoValor - item.valor);
        } else if (item.tipo === 'ACRESCIMO') {
           valorFinal = valorFinal + (data.novoValor - item.valor);
        }
        item.valor = data.novoValor;
        item.sobrescrito = true;
        item.justificativa = data.justificativa;
      }

      await d.execute(sql`
        UPDATE depreciacao_calculos 
        SET detalhamento = ${JSON.stringify(detalhamento)}::jsonb, 
            valor_final = ${valorFinal},
            atualizado_em = now()
        WHERE id = ${data.calculoId}::uuid
      `);
      
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e.message };
    }
  });
