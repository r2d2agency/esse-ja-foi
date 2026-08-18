
import { db } from "./src/db/index";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function seed() {
  if (!db) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  console.log("Seeding test vehicle...");
  try {
    // Garantir colunas
    await db.execute(sql`
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS status_analise text DEFAULT 'AGUARDANDO_ANALISE';
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS responsavel_analise_id uuid;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS perfil_id uuid;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS vendedor_id uuid;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS fotos text;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS documento_crlv_url text;
    `);

    const id = 'ddd988ae-47e1-4699-ba71-d77a427062e1';
    await db.execute(sql`
      INSERT INTO veiculos (id, placa, marca, modelo, ano_fabricacao, ano_modelo, km, cor, combustivel, cambio, status, status_analise, criado_em, atualizado_em)
      VALUES (${id}, 'ABS1245', 'CHEVROLET', 'ONIX', '2023', '2024', 5000, 'PRETO', 'FLEX', 'AUTOMATICO', 'AGUARDANDO_ANALISE', 'AGUARDANDO_ANALISE', now(), now())
      ON CONFLICT (id) DO UPDATE SET 
        placa = EXCLUDED.placa, 
        marca = EXCLUDED.marca, 
        modelo = EXCLUDED.modelo,
        status_analise = EXCLUDED.status_analise;
    `);
    console.log("Success! Chevrolet Onix seeded with ID:", id);
  } catch (err) {
    console.error("Seed failed:", err);
  }
}

seed();
