import { sql } from "drizzle-orm";
import { db } from "./index";
import { RegraNegocioError } from "./cadastro.server";

function requireDb() {
  if (!db) throw new RegraNegocioError("Banco de dados indisponível.", 503);
  return db;
}

export async function ensureVendedoresSchema() {
  const d = requireDb();
  
  // Garantir colunas documento status no profile
  await d.execute(sql`
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS documento_cnh_status text DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS documento_crlv_status text DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS documento_selfie_status text DEFAULT 'PENDENTE';
  `);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_analise (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vendedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      status text NOT NULL DEFAULT 'AGUARDANDO_ANALISE',
      responsavel_id uuid REFERENCES profiles(id),
      observacoes_internas text,
      atualizado_em timestamptz NOT NULL DEFAULT now(),
      UNIQUE(vendedor_id)
    );
  `);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_historico (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vendedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      autor_id uuid REFERENCES profiles(id),
      acao text NOT NULL,
      detalhe text,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_pendencias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vendedor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      documento_tipo text NOT NULL,
      motivo text NOT NULL,
      mensagem text,
      status text NOT NULL DEFAULT 'PENDENTE',
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function listarVendedores(filtros: { status?: string | undefined, busca?: string | undefined }) {
  const d = requireDb();
  await ensureVendedoresSchema();
  
  const busca = `%${filtros.busca || ""}%`;
  const whereStatus = filtros.status ? sql`AND c.status = ${filtros.status}` : sql``;
  
  return (await d.execute(sql`
    SELECT 
      p.id, p.nome, p.cpf, p.email, p.whatsapp, p.criado_em,
      COALESCE(c.status, 'INCOMPLETO') as compliance_status,
      (SELECT count(*)::int FROM veiculos v WHERE v.perfil_id = p.id) as total_veiculos,
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

export async function obterDetalheVendedor(id: string) {
  const d = requireDb();
  await ensureVendedoresSchema();

  const perfil = (await d.execute(sql`
    SELECT * FROM profiles WHERE id = ${id}::uuid AND role = 'vendedor'::app_role
  `)) as any;
  
  if (!perfil.rows?.[0] && !perfil[0]) throw new RegraNegocioError("Vendedor não encontrado.", 404);
  const p = perfil.rows?.[0] || perfil[0];

  const compliance = (await d.execute(sql`
    SELECT c.*, res.nome as responsavel_nome 
    FROM compliance_analise c 
    LEFT JOIN profiles res ON res.id = c.responsavel_id
    WHERE c.vendedor_id = ${id}::uuid
  `)) as any;

  const historico = (await d.execute(sql`
    SELECT h.*, p.nome as autor_nome
    FROM compliance_historico h
    LEFT JOIN profiles p ON p.id = h.autor_id
    WHERE h.vendedor_id = ${id}::uuid
    ORDER BY h.criado_em DESC
  `)) as any;

  const veiculos = (await d.execute(sql`
    SELECT id, placa, marca, modelo, status, criado_em
    FROM veiculos WHERE perfil_id = ${id}::uuid
  `)) as any;

  return {
    perfil: p,
    compliance: compliance.rows?.[0] || compliance[0] || null,
    historico: historico.rows || historico,
    veiculos: veiculos.rows || veiculos
  };
}

export async function registrarAcaoCompliance(vendedorId: string, autorId: string, acao: string, detalhe?: string) {
  const d = requireDb();
  await d.execute(sql`
    INSERT INTO compliance_historico (vendedor_id, autor_id, acao, detalhe)
    VALUES (${vendedorId}::uuid, ${autorId}::uuid, ${acao}, ${detalhe || null});
  `);
}

export async function assumirAnalise(vendedorId: string, responsavelId: string) {
  const d = requireDb();
  await ensureVendedoresSchema();
  
  await d.execute(sql`
    INSERT INTO compliance_analise (vendedor_id, responsavel_id, status)
    VALUES (${vendedorId}::uuid, ${responsavelId}::uuid, 'EM_COMPLIANCE')
    ON CONFLICT (vendedor_id) DO UPDATE SET 
      responsavel_id = EXCLUDED.responsavel_id,
      status = 'EM_COMPLIANCE',
      atualizado_em = now();
  `);
  
  await registrarAcaoCompliance(vendedorId, responsavelId, "ASSUMIU_ANALISE", "Administrador assumiu a análise de compliance.");
  return { ok: true };
}

export async function atualizarStatusDocumento(vendedorId: string, documentoTipo: string, status: string, autorId: string) {
  const d = requireDb();
  const col = `documento_${documentoTipo.toLowerCase()}_status`;
  
  await d.execute(sql.raw(`
    UPDATE profiles SET ${col} = '${status}', atualizado_em = now() WHERE id = '${vendedorId}';
  `));
  
  await registrarAcaoCompliance(vendedorId, autorId, `DOC_${status}`, `Status do documento ${documentoTipo.toUpperCase()} alterado para ${status}.`);
  return { ok: true };
}

