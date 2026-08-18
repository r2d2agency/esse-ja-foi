import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getVeiculoDetalheAdminFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    const rows = await db.execute(sql`
      SELECT 
        v.*, 
        p.nome as vendedor_nome, p.email as vendedor_email, p.whatsapp as vendedor_whatsapp,
        p.documento_cnh_url as vendedor_cnh, p.documento_crlv_url as vendedor_crlv, p.documento_selfie_url as vendedor_selfie,
        p.documento_crlv_status as vendedor_crlv_status,
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

export const assumirAnaliseVeiculoFn = createServerFn({ method: "POST" })
  .validator(z.object({
    veiculoId: z.string().uuid(),
    responsavelId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    await db.execute(sql`
      UPDATE veiculos 
      SET 
        responsavel_analise_id = ${data.responsavelId}::uuid,
        status_analise = 'EM_ANALISE',
        atualizado_em = now()
      WHERE id = ${data.veiculoId}::uuid
    `);

    await db.execute(sql`
      INSERT INTO logs (entidade, entidade_id, acao, detalhe, usuario)
      VALUES ('veiculo', ${data.veiculoId}::uuid, 'ASSUMIR_ANALISE', 'Análise assumida pelo administrador', ${data.responsavelId}::uuid)
    `);

    return { ok: true as const };
  });

export const atualizarStatusAnaliseFn = createServerFn({ method: "POST" })
  .validator(z.object({
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

    // Validação extra: Se estiver tentando liberar para vistoria, verificar CRLV
    if (data.status === 'PRONTO_PARA_VISTORIA') {
      const vQuery = await db.execute(sql`
        SELECT p.documento_crlv_status 
        FROM veiculos v 
        JOIN profiles p ON p.id = v.perfil_id 
        WHERE v.id = ${data.veiculoId}::uuid
      `);
      const v = (vQuery as any).rows?.[0] || (vQuery as any)[0];
      
      if (v?.documento_crlv_status !== 'APROVADO') {
        return { ok: false as const, message: "O CRLV-e deve estar APROVADO para liberar para vistoria." };
      }
    }

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

export const atualizarStatusDocumentoVeiculoFn = createServerFn({ method: "POST" })
  .validator(z.object({
    veiculoId: z.string().uuid(),
    perfilId: z.string().uuid(),
    documentoTipo: z.string(), // e.g., 'CRLV'
    status: z.string(),
    motivo: z.string().optional(),
    observacao: z.string().optional(),
    responsavelId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    const colStatus = `documento_${data.documentoTipo.toLowerCase()}_status`;
    
    // 1. Atualizar status do documento no perfil
    await db.execute(sql.raw(`
      UPDATE profiles 
      SET ${colStatus} = '${data.status}', 
          atualizado_em = now() 
      WHERE id = '${data.perfilId}'
    `));

    // 2. Se for pendência, registrar na tabela de pendências
    if (data.status === 'NOVO_ENVIO_SOLICITADO' || data.status === 'PENDENCIA') {
      await db.execute(sql`
        INSERT INTO compliance_pendencias (vendedor_id, documento_tipo, motivo, mensagem, status)
        VALUES (${data.perfilId}::uuid, ${data.documentoTipo}, ${data.motivo || 'N/A'}, ${data.observacao || null}, 'PENDENTE')
      `);
      
      // Também marcar status_compliance como PENDENCIA se não estiver já
      await db.execute(sql`
        UPDATE profiles SET status_compliance = 'PENDENCIA' WHERE id = ${data.perfilId}::uuid
      `);
    }

    // 3. Registrar no histórico de compliance
    const detalheAcao = data.motivo ? `Motivo: ${data.motivo}. ${data.observacao || ''}` : `Status alterado para ${data.status}`;
    await db.execute(sql`
      INSERT INTO compliance_historico (vendedor_id, autor_id, acao, detalhe)
      VALUES (${data.perfilId}::uuid, ${data.responsavelId}::uuid, ${`DOC_${data.documentoTipo.toUpperCase()}_${data.status}`}, ${detalheAcao})
    `);

    // 4. Registrar log do veículo
    await db.execute(sql`
      INSERT INTO logs (entidade, entidade_id, acao, detalhe, usuario)
      VALUES ('veiculo', ${data.veiculoId}::uuid, 'DOC_STATUS_CHANGE', ${`${data.documentoTipo}: ${data.status}`}, ${data.responsavelId}::uuid)
    `);

    return { ok: true as const };
  });

