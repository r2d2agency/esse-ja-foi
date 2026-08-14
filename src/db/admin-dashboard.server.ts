import { sql } from "drizzle-orm";
import { db } from "./index";

export async function getDashboardStats() {
  if (!db) return null;
  
  const stats = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM profiles WHERE role = 'vendedor') as novos_vendedores,
      (SELECT count(*) FROM profiles WHERE role = 'vendedor' AND cadastro_completo = false) as compliance_analise,
      (SELECT count(*) FROM veiculos WHERE status = 'CADASTRADO') as veiculos_analise,
      (SELECT count(*) FROM veiculos WHERE status = 'APROVADO') as prontos_vistoria,
      0 as pendencias,
      0 as contratos_pendentes
  `);
  
  const funnel = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM veiculos WHERE status = 'CADASTRADO') as cadastro,
      (SELECT count(*) FROM profiles WHERE role = 'vendedor' AND cadastro_completo = false) as compliance,
      0 as contrato,
      (SELECT count(*) FROM veiculos WHERE status = 'ANALISE') as analise_veiculo,
      (SELECT count(*) FROM veiculos WHERE status = 'EM_VISTORIA') as vistoria,
      (SELECT count(*) FROM veiculos WHERE status = 'ANUNCIADO') as anuncio,
      (SELECT count(*) FROM veiculos WHERE status = 'VENDIDO') as venda
  `);

  const activity = await db.execute(sql`
    SELECT entidade, acao, detalhe, usuario, criado_em
    FROM logs
    ORDER BY criado_em DESC
    LIMIT 10
  `);

  return {
    stats: (stats as any).rows?.[0] || (stats as any)[0],
    funnel: (funnel as any).rows?.[0] || (funnel as any)[0],
    activity: (activity as any).rows || activity
  };
}
