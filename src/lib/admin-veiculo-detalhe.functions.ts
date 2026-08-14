import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getVeiculoDetalheAdminFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    const rows = await db.execute(sql`
      SELECT 
        v.*, 
        p.nome as vendedor_nome, p.email as vendedor_email, p.whatsapp as vendedor_whatsapp,
        p.documento_cnh_url as vendedor_cnh, p.documento_crlv_url as vendedor_crlv, p.documento_selfie_url as vendedor_selfie,
        p.cadastro_completo as vendedor_cadastro_completo,
        ca.status as compliance_status,
        resp.nome as responsavel_nome
      FROM veiculos v
      LEFT JOIN profiles p ON p.id = v.perfil_id
      LEFT JOIN compliance_analise ca ON ca.vendedor_id = p.id
      LEFT JOIN profiles resp ON resp.id = v.responsavel_analise_id
      WHERE v.id = ${data.id}::uuid
      LIMIT 1
    `);
    
    const veiculo = (rows as any).rows?.[0] || (rows as any)[0];
    if (!veiculo) return { ok: false as const, message: "Veículo não encontrado." };

    // Buscar histórico/logs do veículo
    const logsRows = await db.execute(sql`
      SELECT * FROM logs 
      WHERE entidade = 'veiculo' AND entidade_id = ${data.id}::uuid
      ORDER BY criado_em DESC
    `);

    return { 
      ok: true as const, 
      data: veiculo,
      historico: (logsRows as any).rows || logsRows
    };
  });

export const atualizarStatusAnaliseFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    veiculoId: z.string().uuid(),
    status: z.string(),
    observacaoInterna: z.string().optional(),
    mensagemVendedor: z.string().optional(),
    responsavelId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    await db.execute(sql`
      UPDATE veiculos 
      SET 
        status_analise = ${data.status},
        observacoes = COALESCE(${data.observacaoInterna ?? null}, observacoes),
        atualizado_em = now()
      WHERE id = ${data.veiculoId}::uuid
    `);

    await db.execute(sql`
      INSERT INTO logs (entidade, entidade_id, acao, detalhe, usuario)
      VALUES ('veiculo', ${data.veiculoId}::uuid, 'ALTERACAO_STATUS_ANALISE', ${data.status}, ${data.responsavelId}::uuid)
    `);

    return { ok: true as const };
  });
