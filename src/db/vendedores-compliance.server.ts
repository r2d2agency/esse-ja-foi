import { sql } from "drizzle-orm";
import { db } from "./index";
import { RegraNegocioError } from "./cadastro.server";

function requireDb() {
  if (!db) throw new RegraNegocioError("Banco de dados indisponível.", 503);
  return db;
}

export async function ensureVendedoresSchema() {
  const d = requireDb();
  
  // Garantir colunas documento status no profile e novos campos compliance
  await d.execute(sql`
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS documento_cnh_status text DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS documento_crlv_status text DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS documento_selfie_status text DEFAULT 'PENDENTE',
    ADD COLUMN IF NOT EXISTS compliance_motivo_pendencia text,
    ADD COLUMN IF NOT EXISTS compliance_data_analise timestamptz,
    ADD COLUMN IF NOT EXISTS compliance_responsavel_id uuid;
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

/** 
 * Centraliza o cálculo de progresso do vendedor.
 * Define o que é obrigatório para cada etapa.
 */
export function calcularProgressoVendedor(p: any) {
  const etapas = {
    conta: "CONCLUIDO",
    dados_pessoais: "PENDENTE",
    endereco: "PENDENTE",
    documentos: "PENDENTE",
    validacao: "PENDENTE"
  };

  // 1. Dados Pessoais: Nome, Email, CPF, Data Nascimento
  if (p.nome && p.email && p.cpf && p.data_nascimento) {
    etapas.dados_pessoais = "CONCLUIDO";
  }

  // 2. Endereço: CEP, Logradouro, Número, Bairro, Cidade, UF
  if (p.cep && p.endereco && p.numero && p.bairro && p.cidade && p.uf) {
    etapas.endereco = "CONCLUIDO";
  }

  // 3. Documentos: CNH Frente, Verso, CRLV, Comprovante Residência
  if (p.documento_cnh_url && p.documento_cnh_verso_url && p.documento_crlv_url && p.documento_comprovante_endereco_url) {
    etapas.documentos = "CONCLUIDO";
  }

  // 4. Validação: Selfie
  if (p.documento_selfie_url) {
    etapas.validacao = "CONCLUIDO";
  }

  const concluidas = Object.values(etapas).filter(v => v === "CONCLUIDO").length;
  const total = Object.keys(etapas).length;
  const progresso = Math.round((concluidas / total) * 100);

  return {
    progresso,
    etapas,
    isCompleto: progresso === 100
  };
}

export const COMPLIANCE_STATUS_LABELS: Record<string, string> = {
  'NAO_ENVIADO': 'Não Enviado',
  'AGUARDANDO_ANALISE': 'Aguardando análise',
  'EM_ANALISE': 'Em análise',
  'PENDENCIA': 'Pendência',
  'APROVADO': 'Aprovado',
  'REPROVADO': 'Reprovado',
  'BLOQUEADO': 'Bloqueado'
};

export async function listarVendedores(filtros: { status?: string | undefined, busca?: string | undefined }) {
  const d = requireDb();
  await ensureVendedoresSchema();
  
  const busca = `%${filtros.busca || ""}%`;
  const whereStatus = filtros.status ? sql`AND p.status_compliance = ${filtros.status}` : sql``;
  
  const rows = (await d.execute(sql`
    SELECT 
      p.id, p.nome, p.cpf, p.email, p.whatsapp, p.criado_em,
      p.status_compliance as compliance_status,
      p.cadastro_completo,
      (SELECT count(*)::int FROM veiculos v WHERE v.perfil_id = p.id) as total_veiculos,
      res.nome as responsavel_nome
    FROM profiles p
    LEFT JOIN profiles res ON res.id = p.compliance_responsavel_id
    WHERE p.role = 'vendedor'::app_role
      ${whereStatus}
      AND (p.nome ILIKE ${busca} OR p.cpf ILIKE ${busca} OR p.email ILIKE ${busca})
    ORDER BY p.criado_em DESC;
  `)) as any;

  return (rows.rows || rows).map((r: any) => ({
    ...r,
    compliance_status_label: COMPLIANCE_STATUS_LABELS[r.compliance_status] || r.compliance_status
  }));
}

export async function obterDetalheVendedor(id: string) {
  const d = requireDb();
  await ensureVendedoresSchema();

  const perfil = (await d.execute(sql`
    SELECT * FROM profiles WHERE id = ${id}::uuid AND role = 'vendedor'::app_role
  `)) as any;
  
  if (!perfil.rows?.[0] && !perfil[0]) throw new RegraNegocioError("Vendedor não encontrado.", 404);
  const p = perfil.rows?.[0] || perfil[0];

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

  const progresso = calcularProgressoVendedor(p);

  return {
    perfil: {
      ...p,
      compliance_status_label: COMPLIANCE_STATUS_LABELS[p.status_compliance] || p.status_compliance
    },
    progresso,
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
    UPDATE profiles SET 
      compliance_responsavel_id = ${responsavelId}::uuid,
      status_compliance = 'EM_ANALISE',
      atualizado_em = now()
    WHERE id = ${vendedorId}::uuid;
  `);
  
  await registrarAcaoCompliance(vendedorId, responsavelId, "ASSUMIU_ANALISE", "Administrador assumiu a análise de compliance.");
  return { ok: true };
}

export async function atualizarStatusDocumento(vendedorId: string, documentoTipo: string, status: string, autorId: string) {
  const d = requireDb();
  const col = `documento_${documentoTipo.toLowerCase()}_status`;
  
  // Usar query parametrizada segura
  await d.execute(sql.raw(`
    UPDATE profiles SET ${col} = $1, atualizado_em = now() WHERE id = $2
  `), [status, vendedorId]);
  
  await registrarAcaoCompliance(vendedorId, autorId, `DOC_${status}`, `Status do documento ${documentoTipo.toUpperCase()} alterado para ${status}.`);
  return { ok: true };
}

export async function aprovarVendedorCompliance(vendedorId: string, autorId: string) {
  const d = requireDb();
  await d.execute(sql`
    UPDATE profiles SET 
      status_compliance = 'APROVADO',
      compliance_data_analise = now(),
      atualizado_em = now()
    WHERE id = ${vendedorId}::uuid;
  `);
  await registrarAcaoCompliance(vendedorId, autorId, "COMPLIANCE_APROVADO", "Vendedor aprovado em compliance.");
  return { ok: true };
}

export async function solicitarPendenciaCompliance(vendedorId: string, autorId: string, motivo: string) {
  const d = requireDb();
  await d.execute(sql`
    UPDATE profiles SET 
      status_compliance = 'PENDENCIA',
      compliance_motivo_pendencia = ${motivo},
      atualizado_em = now()
    WHERE id = ${vendedorId}::uuid;
  `);
  await registrarAcaoCompliance(vendedorId, autorId, "COMPLIANCE_PENDENCIA", `Pendência solicitada: ${motivo}`);
  return { ok: true };
}

