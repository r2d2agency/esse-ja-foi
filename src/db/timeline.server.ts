import { sql } from "drizzle-orm";
import { db } from "./index";

export async function ensureTimelineSchema() {
  if (!db) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS veiculo_timeline (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL REFERENCES veiculos.id ON DELETE CASCADE,
      tipo text NOT NULL,
      descricao text NOT NULL,
      responsavel_id uuid REFERENCES profiles(id),
      criado_em timestamp DEFAULT now() NOT NULL
    );
  `);
}

export async function adicionarEventoTimeline(veiculoId: string, tipo: string, descricao: string, responsavelId?: string) {
  const d = db;
  if (!d) return;
  await ensureTimelineSchema();
  await d.execute(sql`
    INSERT INTO veiculo_timeline (veiculo_id, tipo, descricao, responsavel_id)
    VALUES (${veiculoId}::uuid, ${tipo}, ${descricao}, ${responsavelId ? sql`${responsavelId}::uuid` : null})
  `);
}
