import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { calcularProgressoVendedor, ensureVendedoresSchema } from "@/db/vendedores-compliance.server";

export const getOnboardingStatusFn = createServerFn({ method: "GET" })
  .validator(z.object({ perfilId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    if (!db) throw new Error("Banco de dados indisponível");
    await ensureVendedoresSchema();

    const rows = await db.execute(sql`
      SELECT * FROM profiles WHERE id = ${data.perfilId}::uuid LIMIT 1;
    `);
    const profile = (rows as any).rows?.[0] || (rows as any)[0];
    
    if (!profile) throw new Error("Perfil não encontrado");

    const status = calcularProgressoVendedor(profile);
    const pendenciasRows = await db.execute(sql`
      SELECT id, documento_tipo, motivo, mensagem, status, criado_em
      FROM compliance_pendencias
      WHERE vendedor_id = ${data.perfilId}::uuid
        AND status IN ('PENDENTE', 'REPROVADO')
      ORDER BY criado_em DESC
    `);
    const pendencias = (pendenciasRows as any).rows || pendenciasRows || [];
    
    return {
      ok: true as const,
      progresso: status.progresso,
      etapas: status.etapas,
      cadastroCompleto: profile.cadastro_completo,
      complianceStatus: profile.status_compliance,
      motivoPendencia: profile.compliance_motivo_pendencia,
      pendencias,
      verificado: profile.verificado,
      dataVerificacao: profile.compliance_data_analise
    };
  });
