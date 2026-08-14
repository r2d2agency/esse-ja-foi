import { sql } from "drizzle-orm";
import { db } from "./index";

export type Row = Record<string, string | number | boolean | Date | null>;

const num = (v: unknown) => Number(v ?? 0);

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!db) return fallback;
    return await fn();
  } catch (error) {
    console.error("[dashboard]", (error as Error)?.message);
    return fallback;
  }
}

export async function ensureLeilaoSchema() {
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leiloes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL,
      inicio_em timestamptz NOT NULL DEFAULT now(),
      fim_em timestamptz NOT NULL DEFAULT now(),
      lance_inicial numeric(12,2) NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'AGENDADO',
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS lances (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      leilao_id uuid NOT NULL REFERENCES leiloes(id) ON DELETE CASCADE,
      comprador_email text NOT NULL,
      valor numeric(12,2) NOT NULL,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function indicadoresAdmin() {
  return safe(async () => {
    const { ensureCadastroSchema } = await import("./cadastro.server");
    const { ensureVistoriaSchema } = await import("./vistorias.server");
    await ensureCadastroSchema();
    await ensureLeilaoSchema();
    await ensureVistoriaSchema();
    const rows = (await db!.execute(sql`
      SELECT
        (SELECT count(*) FROM veiculos) AS veiculos,
        (SELECT count(*) FROM veiculos WHERE upper(status_analise) = 'PRONTO_PARA_VISTORIA') AS prontos_vistoria,
        (SELECT count(*) FROM vistorias WHERE upper(status) = 'AGUARDANDO_CONFIRMACAO') AS aguardando_confirmacao,
        (SELECT count(*) FROM vistorias WHERE data_vistoria = CURRENT_DATE) AS vistorias_hoje,
        (SELECT count(*) FROM veiculos WHERE upper(status) = 'VENDIDO') AS vendidos,
        (SELECT count(*) FROM profiles WHERE role = 'comprador') AS clientes,
        (SELECT count(*) FROM leiloes WHERE upper(status) = 'ABERTO') AS leiloes_ativos
    `)) as unknown as Array<Record<string, string>>;
    const r = rows[0] ?? {};
    return {
      veiculos: num(r['veiculos']),
      prontosVistoria: num(r['prontos_vistoria']),
      aguardandoConfirmacao: num(r['aguardando_confirmacao']),
      vistoriasHoje: num(r['vistorias_hoje']),
      vendidos: num(r['vendidos']),
      clientes: num(r['clientes']),
      leiloesAtivos: num(r['leiloes_ativos']),
    };
  }, {
    veiculos: 0, prontosVistoria: 0, aguardandoConfirmacao: 0, vistoriasHoje: 0, vendidos: 0, clientes: 0, leiloesAtivos: 0,
  });
}

export async function veiculosRecentes(limite = 10) {
  return safe(async () => {
    const { ensureCadastroSchema } = await import("./cadastro.server");
    await ensureCadastroSchema();
    return (await db!.execute(sql`
      SELECT v.id, v.placa, v.marca, v.modelo, v.status, v.criado_em, c.nome AS cliente_nome
      FROM veiculos v LEFT JOIN clientes c ON c.id = v.cliente_id
      ORDER BY v.criado_em DESC LIMIT ${limite};
    `)) as unknown as Array<Row>;
  }, [] as Array<Row>);
}

export function bancoDisponivel() {
  return !!db;
}

export async function leadsRecentes(limite = 10) {
  return [];
}

export async function totaisLeads() {
  return { total: 0, novos: 0 };
}

export async function filaOperacao() {
  return safe(async () => {
    const { ensureCadastroSchema } = await import("./cadastro.server");
    await ensureCadastroSchema();
    return (await db!.execute(sql`
      SELECT v.id, v.placa, v.marca, v.modelo, v.status, v.cidade, v.criado_em, c.nome AS cliente_nome
      FROM veiculos v LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE upper(v.status) IN ('CADASTRADO', 'AGENDADO', 'EM_VISTORIA', 'EM_AVALIACAO')
      ORDER BY v.criado_em ASC LIMIT 100;
    `)) as unknown as Array<Row>;
  }, [] as Array<Row>);
}

export async function leiloesAbertos() {
  return safe(async () => {
    const { ensureCadastroSchema } = await import("./cadastro.server");
    await ensureCadastroSchema();
    await ensureLeilaoSchema();
    return (await db!.execute(sql`
      SELECT l.id, l.status, l.inicio_em, l.fim_em, l.lance_inicial,
             v.placa, v.marca, v.modelo,
             (SELECT max(valor) FROM lances b WHERE b.leilao_id = l.id) AS maior_lance
      FROM leiloes l JOIN veiculos v ON v.id = l.veiculo_id
      WHERE upper(l.status) = 'ABERTO'
      ORDER BY l.fim_em ASC LIMIT 50;
    `)) as unknown as Array<Row>;
  }, [] as Array<Row>);
}

export async function meusLances(email: string) {
  return safe(async () => {
    await ensureLeilaoSchema();
    return (await db!.execute(sql`
      SELECT l.id AS leilao_id, v.placa, v.marca, v.modelo, l.status,
             max(b.valor) FILTER (WHERE lower(b.comprador_email) = lower(${email})) AS meu_lance,
             max(b.valor) AS lance_atual
      FROM lances b
      JOIN leiloes l ON l.id = b.leilao_id
      JOIN veiculos v ON v.id = l.veiculo_id
      WHERE l.id IN (SELECT leilao_id FROM lances WHERE lower(comprador_email) = lower(${email}))
      GROUP BY l.id, v.placa, v.marca, v.modelo, l.status
      ORDER BY l.fim_em ASC LIMIT 50;
    `)) as unknown as Array<Row>;
  }, [] as Array<Row>);
}
