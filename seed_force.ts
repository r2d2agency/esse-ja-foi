import { sql } from "drizzle-orm";
import { db } from "./src/db/index";

async function run() {
  if (!db) process.exit(1);
  try {
    const adminEmail = "tnicodemos@gmail.com";
    const adminRes = await db.execute(sql`SELECT id FROM profiles WHERE email = ${adminEmail} LIMIT 1`);
    const adminRows = (adminRes as any).rows || adminRes;
    const adminId = adminRows[0]?.id;

    if (!adminId) {
       console.error("Admin não encontrado. Execute o app primeiro.");
       process.exit(1);
    }

    const onixId = 'ddd988ae-47e1-4699-ba71-d77a427062e1';
    
    // Deletar para evitar conflitos
    await db.execute(sql`DELETE FROM veiculos WHERE placa = 'ABS1245'`);
    await db.execute(sql`DELETE FROM veiculos WHERE id = ${onixId}::uuid`);

    // Inserir Onix com colunas mínimas para análise
    await db.execute(sql`
      INSERT INTO veiculos (
        id, placa, marca, modelo, status, status_analise, 
        perfil_id, vendedor_id, renavam, ano_fabricacao, ano_modelo,
        km, cor, combustivel, cambio, valor_fipe, valor_interesse_cliente,
        documento_crlv_url, criado_em, atualizado_em
      ) VALUES (
        ${onixId}::uuid, 'ABS1245', 'CHEVROLET', 'ONIX', 'AGUARDANDO_ANALISE', 'AGUARDANDO_ANALISE',
        ${adminId}::uuid, ${adminId}::uuid, '123456789', '2023', '2024',
        15000, 'Branco', 'Flex', 'Manual', 78000, 75000,
        'https://placehold.co/600x400?text=CRLV-e+Onix', now(), now()
      )
    `);

    console.log("Veículo Onix inserido com sucesso.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
