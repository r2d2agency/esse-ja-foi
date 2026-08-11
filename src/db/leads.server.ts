import { sql } from "drizzle-orm";
import { db } from "./index";
import { onlyDigits } from "@/lib/validators";

export type Row = Record<string, string | number | boolean | Date | null>;

export class LeadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function requireDb() {
  if (!db) throw new LeadError("Banco de dados indisponível. Verifique a DATABASE_URL.", 503);
  return db;
}

let prepared = false;

export async function ensureLeadsSchema() {
  if (prepared) return;
  const d = requireDb();
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      whatsapp text NOT NULL,
      cidade text,
      marca text,
      modelo text,
      ano text,
      mensagem text,
      origem text DEFAULT 'LANDING',
      campanha text,
      status text NOT NULL DEFAULT 'NOVO',
      responsavel text,
      convertido_cliente_id uuid,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  for (const [col, type] of [
    ["responsavel", "text"],
    ["utm_source", "text"],
    ["utm_medium", "text"],
    ["utm_campaign", "text"],
    ["atualizado_em", "timestamptz NOT NULL DEFAULT now()"],
    ["convertido_cliente_id", "uuid"],
  ] as Array<[string, string]>) {
    await d.execute(sql.raw(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} ${type};`));
  }
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS lead_interacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      acao text NOT NULL,
      usuario text,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  prepared = true;
}

export type LeadPublicoInput = {
  nome: string;
  whatsapp: string;
  cidade?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: string | null;
  mensagem?: string | null;
  origem?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
};

export async function criarLeadPublico(input: LeadPublicoInput) {
  await ensureLeadsSchema();
  const d = requireDb();
  const nome = (input.nome ?? "").trim();
  const whatsapp = onlyDigits(input.whatsapp ?? "");
  if (nome.length < 3) throw new LeadError("Informe seu nome completo.", 422);
  if (whatsapp.length < 10) throw new LeadError("Informe um WhatsApp válido com DDD.", 422);

  const rows = (await d.execute(sql`
    INSERT INTO leads (nome, whatsapp, cidade, marca, modelo, ano, mensagem, origem, utm_source, utm_medium, utm_campaign)
    VALUES (${nome}, ${whatsapp}, ${input.cidade ?? null}, ${input.marca ?? null}, ${input.modelo ?? null},
            ${input.ano ?? null}, ${input.mensagem ?? null}, ${(input.origem ?? "LANDING").toUpperCase()},
            ${input.utmSource ?? null}, ${input.utmMedium ?? null}, ${input.utmCampaign ?? null})
    RETURNING *;
  `)) as unknown as Array<Row>;
  const lead = rows[0]!;
  await d.execute(sql`
    INSERT INTO lead_interacoes (lead_id, acao, usuario)
    VALUES (${lead['id'] as string}, ${"Lead recebido pelo site"}, ${"Sistema"});
  `);
  return lead;
}

export async function listarLeads(filtros: {
  status?: string | null;
  origem?: string | null;
  cidade?: string | null;
  responsavel?: string | null;
  data?: string | null;
} = {}) {
  await ensureLeadsSchema();
  const d = requireDb();
  const status = (filtros.status ?? "").toUpperCase();
  const origem = (filtros.origem ?? "").toUpperCase();
  const cidade = (filtros.cidade ?? "").toLowerCase();
  const responsavel = (filtros.responsavel ?? "").toLowerCase();
  const data = filtros.data ?? "";
  return (await d.execute(sql`
    SELECT * FROM leads
    WHERE (${status === ""} OR upper(status) = ${status})
      AND (${origem === ""} OR upper(coalesce(origem, '')) = ${origem})
      AND (${cidade === ""} OR lower(coalesce(cidade, '')) LIKE ${`%${cidade}%`})
      AND (${responsavel === ""} OR lower(coalesce(responsavel, '')) LIKE ${`%${responsavel}%`})
      AND (${data === ""} OR criado_em::date = ${data === "" ? null : data}::date)
    ORDER BY criado_em DESC
    LIMIT 300;
  `)) as unknown as Array<Row>;
}

export async function historicoLead(leadId: string) {
  await ensureLeadsSchema();
  const d = requireDb();
  return (await d.execute(sql`
    SELECT * FROM lead_interacoes WHERE lead_id = ${leadId}::uuid ORDER BY criado_em DESC LIMIT 100;
  `)) as unknown as Array<Row>;
}

export async function indicadoresLeads() {
  await ensureLeadsSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`
    SELECT
      count(*) FILTER (WHERE upper(status) = 'NOVO') AS novos,
      count(*) FILTER (WHERE upper(status) = 'EM_ATENDIMENTO') AS em_atendimento,
      count(*) FILTER (WHERE upper(status) = 'AGENDADO') AS agendados,
      count(*) FILTER (WHERE upper(status) = 'CONVERTIDO') AS convertidos,
      count(*) AS total
    FROM leads;
  `)) as unknown as Array<Record<string, string>>;
  const r = rows[0] ?? {};
  const num = (v: unknown) => Number(v ?? 0);
  const total = num(r['total']);
  const convertidos = num(r['convertidos']);
  return {
    novos: num(r['novos']),
    emAtendimento: num(r['em_atendimento']),
    agendados: num(r['agendados']),
    convertidos,
    total,
    taxaConversao: total > 0 ? Math.round((convertidos / total) * 100) : 0,
  };
}

export async function registrarInteracao(leadId: string, acao: string, usuario?: string) {
  await ensureLeadsSchema();
  const d = requireDb();
  if (!acao.trim()) throw new LeadError("Descreva a interação registrada.", 422);
  await d.execute(sql`
    INSERT INTO lead_interacoes (lead_id, acao, usuario)
    VALUES (${leadId}::uuid, ${acao.trim()}, ${usuario ?? "Operação"});
  `);
  await d.execute(sql`
    UPDATE leads SET status = CASE WHEN upper(status) = 'NOVO' THEN 'EM_ATENDIMENTO' ELSE status END,
                     atualizado_em = now()
    WHERE id = ${leadId}::uuid;
  `);
  return historicoLead(leadId);
}

export async function atualizarLead(leadId: string, patch: { status?: string | null; responsavel?: string | null }) {
  await ensureLeadsSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`
    UPDATE leads SET
      status = coalesce(${patch.status ? patch.status.toUpperCase() : null}, status),
      responsavel = coalesce(${patch.responsavel ?? null}, responsavel),
      atualizado_em = now()
    WHERE id = ${leadId}::uuid
    RETURNING *;
  `)) as unknown as Array<Row>;
  if (!rows[0]) throw new LeadError("Lead não encontrado.", 404);
  return rows[0];
}

export async function converterLeadEmCliente(leadId: string) {
  await ensureLeadsSchema();
  const { ensureCadastroSchema } = await import("./cadastro.server");
  await ensureCadastroSchema();
  const d = requireDb();
  const leads = (await d.execute(sql`SELECT * FROM leads WHERE id = ${leadId}::uuid LIMIT 1;`)) as unknown as Array<Row>;
  const lead = leads[0];
  if (!lead) throw new LeadError("Lead não encontrado.", 404);
  if (lead['convertido_cliente_id']) throw new LeadError("Este lead já foi convertido em cliente.", 409);

  const clientes = (await d.execute(sql`
    INSERT INTO clientes (nome, documento, tipo_pessoa, whatsapp, telefone, cidade, observacoes)
    VALUES (${lead['nome'] as string}, ${`L${String(leadId).replace(/-/g, "").slice(0, 14)}`}, ${"PF"}, ${lead['whatsapp'] as string}, ${lead['whatsapp'] as string},
            ${lead['cidade'] ?? null}, ${`Convertido do lead ${leadId}`})
    RETURNING *;
  `)) as unknown as Array<Row>;
  const cliente = clientes[0]!;
  await d.execute(sql`
    UPDATE leads SET status = 'CONVERTIDO', convertido_cliente_id = ${cliente['id'] as string}::uuid, atualizado_em = now()
    WHERE id = ${leadId}::uuid;
  `);
  await d.execute(sql`
    INSERT INTO lead_interacoes (lead_id, acao, usuario) VALUES (${leadId}::uuid, ${"Lead convertido em cliente"}, ${"Operação"});
  `);
  return cliente;
}
