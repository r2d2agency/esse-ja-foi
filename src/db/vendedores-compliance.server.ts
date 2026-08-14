import { sql } from "drizzle-orm";
import { db } from "./index";
import { RegraNegocioError } from "./cadastro.server";

function requireDb() {
  if (!db) throw new RegraNegocioError("Banco de dados indisponível.", 503);
  return db;
}

export async function ensureVendedoresSchema() {
  const d = requireDb();
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_analise (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vendedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'AGUARDANDO_ANALISE',
      responsavel_id uuid,
      observacoes_internas text,
      atualizado_em timestamptz NOT NULL DEFAULT now(),
      UNIQUE(vendedor_id)
    );
  `);
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_pendencias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vendedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      documento_tipo text NOT NULL,
      motivo text NOT NULL,
      status text NOT NULL DEFAULT 'PENDENTE',
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function listarVendedores(filtros: { status?: string | undefined, busca?: string | undefined }) {
  const d = requireDb();
  await ensureVendedoresSchema();
  
  const busca = `%${filtros.busca || ""}%`;
  
  // Usando query builder ou sql template com sintaxe correta para condições dinâmicas
  const whereStatus = filtros.status ? sql`AND c.status = ${filtros.status}` : sql``;
  
  return (await d.execute(sql`
    SELECT 
      p.id, p.nome, p.cpf, p.whatsapp, p.criado_em,
      c.status as compliance_status,
      (SELECT count(*) FROM veiculos v WHERE v.perfil_id = p.id) as total_veiculos,
      res.nome as responsavel_nome
    FROM profiles p
    LEFT JOIN compliance_analise c ON c.vendedor_id = p.id
    LEFT JOIN profiles res ON res.id = c.responsavel_id
    WHERE p.role = 'vendedor'::app_role
      ${whereStatus}
      AND (p.nome ILIKE ${busca} OR p.cpf ILIKE ${busca} OR p.email ILIKE ${busca})
    ORDER BY p.criado_em DESC;
  `)) as any;
}
