import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getComplianceVendedorFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ vendedorId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    const rows = await db.execute(sql`
      SELECT * FROM compliance_analise 
      WHERE vendedor_id = ${data.vendedorId}::uuid
      LIMIT 1
    `);
    
    return (rows as any).rows?.[0] || (rows as any)[0] || null;
  });

export const atualizarComplianceFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    vendedorId: z.string().uuid(),
    status: z.string(),
    observacoes: z.string().optional(),
    responsavelId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    await db.execute(sql`
      INSERT INTO compliance_analise (vendedor_id, status, observacoes, responsavel_id, atualizado_em)
      VALUES (${data.vendedorId}::uuid, ${data.status}, ${data.observacoes ?? null}, ${data.responsavelId}::uuid, now())
      ON CONFLICT (vendedor_id) DO UPDATE SET 
        status = EXCLUDED.status,
        observacoes = EXCLUDED.observacoes,
        responsavel_id = EXCLUDED.responsavel_id,
        atualizado_em = now()
    `);

    // Atualiza o perfil para marcar se o cadastro está validado
    if (data.status === 'APROVADO') {
      await db.execute(sql`
        UPDATE profiles SET cadastro_completo = true WHERE id = ${data.vendedorId}::uuid
      `);
    }

    await db.execute(sql`
      INSERT INTO logs (entidade, entidade_id, acao, detalhe, usuario)
      VALUES ('vendedor', ${data.vendedorId}::uuid, 'COMPLIANCE_STATUS', ${data.status}, ${data.responsavelId}::uuid)
    `);

    return { ok: true as const };
  });

export const getDocumentosVeiculoFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ veiculoId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    const rows = await db.execute(sql`
      SELECT id, entidade, entidade_id, tipo, url, status, observacoes, criado_em
      FROM documentos
      WHERE entidade = 'veiculo' AND entidade_id = ${data.veiculoId}::uuid
      ORDER BY criado_em DESC
    `);
    
    return (rows as any).rows || rows;
  });
