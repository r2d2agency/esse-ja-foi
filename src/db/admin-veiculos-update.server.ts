import { sql } from "drizzle-orm";
import { db } from "./index";

export async function adicionarColunaRenavamChassi() {
  if (!db) return;
  await db.execute(sql`
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS renavam text;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS chassi text;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS cor text;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS km integer;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS combustivel text;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS cambio text;
    ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS portas integer;
  `);
}
