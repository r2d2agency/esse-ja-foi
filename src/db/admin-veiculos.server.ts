import { sql } from "drizzle-orm";
import { db } from "./index";

export async function ensureVeiculosAdminSchema() {
  if (!db) return;
  const d = db;

  // Garantir status 'AGUARDANDO_ANALISE' caso não exista
  await d.execute(sql`
    ALTER TABLE veiculos ALTER COLUMN status SET DEFAULT 'AGUARDANDO_ANALISE';
  `);
  
  // Garantir coluna de responsável
  await d.execute(sql`
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS responsavel_analise_id uuid REFERENCES profiles(id);
  `);
  
  // Garantir coluna de status da análise (para filtros rápidos)
  await d.execute(sql`
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS status_analise text DEFAULT 'AGUARDANDO_ANALISE';
  `);
}

export async function listarVeiculosAdmin(filtros: {
  busca?: string | null;
  status_analise?: string | null;
}) {
  const d = db;
  if (!d) return [];

  const termo = filtros.busca ? `%${filtros.busca}%` : null;
  const status = filtros.status_analise;

  const rows = await d.execute(sql`
    SELECT 
      v.id, v.marca, v.modelo, v.placa, v.ano_modelo, v.valor_interesse_cliente, 
      v.status_analise, v.atualizado_em,
      p.nome as vendedor_nome,
      resp.nome as responsavel_nome
    FROM veiculos v
    LEFT JOIN profiles p ON p.id = v.perfil_id
    LEFT JOIN profiles resp ON resp.id = v.responsavel_analise_id
    WHERE 1=1
      ${status ? sql`AND v.status_analise = ${status}` : sql``}
      ${termo ? sql`AND (v.placa ILIKE ${termo} OR v.marca ILIKE ${termo} OR v.modelo ILIKE ${termo} OR p.nome ILIKE ${termo})` : sql``}
    ORDER BY v.atualizado_em DESC
    LIMIT 100
  `);
  
  return (rows as any).rows || rows;
}
