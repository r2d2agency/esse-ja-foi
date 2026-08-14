import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getVeiculosAdminFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    busca: z.string().optional(),
    status_analise: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { listarVeiculosAdmin, ensureVeiculosAdminSchema } = await import("@/db/admin-veiculos.server");
    await ensureVeiculosAdminSchema();
    const veiculos = await listarVeiculosAdmin({
      busca: data.busca ?? undefined,
      status_analise: data.status_analise ?? undefined,
    });
    return { ok: true as const, data: veiculos };
  });

export const assumirAnaliseVeiculoFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    veiculoId: z.string().uuid(),
    responsavelId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    // Verificar se já tem responsável
    const existing = await db.execute(sql`
      SELECT responsavel_analise_id FROM veiculos WHERE id = ${data.veiculoId}::uuid
    `);
    const row = (existing as any).rows?.[0] || (existing as any)[0];
    
    if (row?.responsavel_analise_id && row.responsavel_analise_id !== data.responsavelId) {
      return { ok: false as const, message: "Outro usuário já assumiu esta análise." };
    }

    await db.execute(sql`
      UPDATE veiculos 
      SET 
        responsavel_analise_id = ${data.responsavelId}::uuid,
        status_analise = 'EM_ANALISE',
        atualizado_em = now()
      WHERE id = ${data.veiculoId}::uuid
    `);

    return { ok: true as const };
  });
