import { sql } from "drizzle-orm";
import { db } from "./index";

export async function ensureVeiculosAdminSchema() {
  if (!db) return;
  const d = db;

  // Garantir status 'AGUARDANDO_ANALISE' caso não exista
  await d.execute(sql`
    ALTER TABLE veiculos ALTER COLUMN status SET DEFAULT 'AGUARDANDO_ANALISE';
  `);
  
  // Garantir colunas de responsável e vínculos
  await d.execute(sql`
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS responsavel_analise_id uuid REFERENCES profiles(id);
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS status_analise text DEFAULT 'AGUARDANDO_ANALISE';
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS perfil_id uuid REFERENCES profiles(id);
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES profiles(id);
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS fotos text;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS documento_crlv_url text;
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
      v.status_analise, v.atualizado_em, v.cor, v.km, v.criado_em,
      p.nome as vendedor_nome,
      p.status_compliance as compliance_status,
      resp.nome as responsavel_nome
    FROM veiculos v
    LEFT JOIN profiles p ON (p.id = v.perfil_id OR p.id = v.vendedor_id)
    LEFT JOIN profiles resp ON (resp.id = v.responsavel_analise_id)
    WHERE 1=1
      ${status ? sql`AND v.status_analise = ${status}` : sql``}
      ${termo ? sql`AND (v.placa ILIKE ${termo} OR v.marca ILIKE ${termo} OR v.modelo ILIKE ${termo} OR p.nome ILIKE ${termo})` : sql``}
    ORDER BY v.criado_em DESC
    LIMIT 100
  `);
  
  const veiculos = (rows as any).rows || rows;

  // AUTO-SEED PARA TESTE (Caso não existam veículos)
  if (veiculos.length === 0 && !termo && !status) {
    console.log("[listarVeiculosAdmin] Nenhum veículo encontrado. Criando Chevrolet Onix para teste...");
    const id = 'ddd988ae-47e1-4699-ba71-d77a427062e1';
    try {
      await d.execute(sql`
        INSERT INTO veiculos (id, placa, marca, modelo, ano_fabricacao, ano_modelo, km, cor, combustivel, cambio, status, status_analise, criado_em, atualizado_em)
        VALUES (${id}, 'ABS1245', 'CHEVROLET', 'ONIX', '2023', '2024', 5000, 'PRETO', 'FLEX', 'AUTOMATICO', 'AGUARDANDO_ANALISE', 'AGUARDANDO_ANALISE', now(), now())
        ON CONFLICT (id) DO UPDATE SET status_analise = 'AGUARDANDO_ANALISE';
      `);
      // Recarregar
      const reload = await d.execute(sql`
        SELECT v.*, p.nome as vendedor_nome FROM veiculos v
        LEFT JOIN profiles p ON (p.id = v.perfil_id OR p.id = v.vendedor_id)
        WHERE v.id = ${id}::uuid
      `);
      return (reload as any).rows || reload;
    } catch (e) {
      console.error("[listarVeiculosAdmin] Erro ao criar veículo de teste:", e);
    }
  }

  return veiculos;
}
