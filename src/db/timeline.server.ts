import { sql } from "drizzle-orm";
import { db } from "./index";

export async function adicionarEventoTimeline(veiculoId: string, tipo: string, descricao: string, responsavelId?: string) {
  const d = db;
  if (!d) return;

  await d.execute(sql`
    INSERT INTO veiculo_timeline (veiculo_id, tipo, descricao, responsavel_id)
    VALUES (${veiculoId}::uuid, ${tipo}, ${descricao}, ${responsavelId ? sql`${responsavelId}::uuid` : null})
  `);
}
