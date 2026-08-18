import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAnalisePosVistoriaFn = createServerFn({ method: "GET" })
  .validator(z.object({ veiculoId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getLaudoCompleto, ensurePosVistoriaSchema } = await import("@/db/pos-vistoria.server");
    await ensurePosVistoriaSchema();
    const laudo = await getLaudoCompleto(data.veiculoId);
    return { ok: true as const, data: laudo };
  });

export const salvarPropostaValorFn = createServerFn({ method: "POST" })
  .validator(z.object({
    veiculoId: z.string().uuid(),
    valorFipe: z.number(),
    valorOferta: z.number(),
    margem: z.number(),
    depreciacoes: z.array(z.object({
      item: z.string(),
      valor: z.number(),
      descricao: z.string().optional()
    })),
    responsavelId: z.string().uuid()
  }))
  .handler(async ({ data }) => {
    const { salvarProposta } = await import("@/db/pos-vistoria.server");
    const res = await salvarProposta(data);
    
    if (res.ok) {
      const { processarEventoSistema } = await import("@/db/automacoes-motor.server");
      // Notificar vendedor
      await processarEventoSistema('PROPOSTA_GERADA', {
        veiculo_id: data.veiculoId,
        vendedor_id: (await import("@/db/index")).db?.execute(
          (await import("drizzle-orm")).sql`SELECT vendedor_id FROM veiculos WHERE id = ${data.veiculoId}::uuid`
        ).then(r => (r as any).rows?.[0]?.vendedor_id)
      });
    }
    
    return res;
  });

export const responderPropostaVendedorFn = createServerFn({ method: "POST" })
  .validator(z.object({
    veiculoId: z.string().uuid(),
    aceito: z.boolean(),
    motivoRecusa: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("DB offline");

    const statusFinal = data.aceito ? 'PRONTO_PARA_ANUNCIO' : 'PROPOSTA_RECUSADA';
    const statusProposta = data.aceito ? 'ACEITA' : 'RECUSADA';

    await db.execute(sql`
      UPDATE veiculos SET 
        status_analise = ${statusFinal},
        status_proposta = ${statusProposta},
        motivo_recusa_proposta = ${data.motivoRecusa || null},
        atualizado_em = now()
      WHERE id = ${data.veiculoId}::uuid
    `);

    return { ok: true };
  });
