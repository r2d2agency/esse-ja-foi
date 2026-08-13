import { sql } from "drizzle-orm";
import { db } from "./index";

export type Row = Record<string, string | number | boolean | Date | null>;

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!db) return fallback;
    return await fn();
  } catch (error) {
    console.error("[leiloes]", (error as Error)?.message);
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

export const listarLeiloesAtivos = async () => {
  return safe(async () => {
    await ensureLeilaoSchema();
    const rows = (await db!.execute(sql`
      SELECT l.id, l.inicio_em, l.fim_em, l.lance_inicial, l.status,
             v.marca, v.modelo, v.placa, v.ano_fabricacao, v.ano_modelo,
             (SELECT max(valor) FROM lances b WHERE b.leilao_id = l.id) AS maior_lance,
             (SELECT count(*) FROM lances b WHERE b.leilao_id = l.id) AS total_lances
      FROM leiloes l
      JOIN veiculos v ON v.id = l.veiculo_id
      WHERE upper(l.status) = 'ABERTO' AND l.fim_em > now()
      ORDER BY l.fim_em ASC;
    `)) as unknown as Array<Row>;
    return { ok: true, data: rows };
  }, { ok: false, data: [] as Row[] });
};

export const obterDetalhesLeilao = async (id: string) => {
  return safe(async () => {
    await ensureLeilaoSchema();
    const leilaoRes = (await db!.execute(sql`
      SELECT l.*, v.marca, v.modelo, v.placa, v.ano_fabricacao, v.ano_modelo
      FROM leiloes l
      JOIN veiculos v ON v.id = l.veiculo_id
      WHERE l.id = ${id}
    `)) as unknown as Array<Row>;
    
    if (leilaoRes.length === 0) return { ok: false, message: "Leilão não encontrado" };

    const lancesRes = (await db!.execute(sql`
      SELECT * FROM lances WHERE leilao_id = ${id} ORDER BY valor DESC LIMIT 10
    `)) as unknown as Array<Row>;

    return { ok: true, data: { ...leilaoRes[0], lances: lancesRes } };
  }, { ok: false, message: "Erro ao buscar detalhes" });
};

export const registrarLance = async (leilaoId: string, valor: string, compradorEmail: string = "visitante@teste.com") => {
  return safe(async () => {
    await ensureLeilaoSchema();
    
    // Validar se leilão está aberto
    const leilao = (await db!.execute(sql`SELECT status, fim_em FROM leiloes WHERE id = ${leilaoId}`)) as unknown as Array<Row>;
    if (!leilao.length || String(leilao[0]?.['status']).toUpperCase() !== 'ABERTO' || new Date(String(leilao[0]?.['fim_em'])) < new Date()) {
      return { ok: false, message: "Leilão não está ativo para lances" };
    }

    // Validar se valor é superior ao atual
    const atual = (await db!.execute(sql`SELECT max(valor) as maior FROM lances WHERE leilao_id = ${leilaoId}`)) as unknown as Array<Row>;
    const v = Number(valor);
    const m = Number(atual[0]?.['maior'] ?? 0);
    
    if (v <= m) return { ok: false, message: "Seu lance deve ser maior que o lance atual" };

    await db!.execute(sql`
      INSERT INTO lances (leilao_id, comprador_email, valor)
      VALUES (${leilaoId}, ${compradorEmail}, ${v})
    `);

    return { ok: true, message: "Lance registrado com sucesso" };
  }, { ok: false, message: "Erro ao registrar lance" });
};
