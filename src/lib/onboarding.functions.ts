import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { calcularProgressoVendedor } from "@/db/vendedores-compliance.server";

export const getOnboardingStatusFn = createServerFn({ method: "GET" })
  .validator(z.object({ perfilId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    if (!db) throw new Error("Banco de dados indisponível");

    const rows = await db.execute(sql`
      SELECT * FROM profiles WHERE id = ${data.perfilId}::uuid LIMIT 1;
    `);
    const profile = (rows as any).rows?.[0] || (rows as any)[0];
    
    if (!profile) throw new Error("Perfil não encontrado");

    const status = calcularProgressoVendedor(profile);
    
    return {
      ok: true as const,
      progresso: status.progresso,
      etapas: status.etapas,
      cadastroCompleto: profile.cadastro_completo,
      complianceStatus: profile.status_compliance,
      motivoPendencia: profile.compliance_motivo_pendencia
    };
  });
