import { sql } from "drizzle-orm";
import { db } from "./src/db/index";

async function run() {
  if (!db) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }
  
  try {
    const onixId = 'ddd988ae-47e1-4699-ba71-d77a427062e1';
    
    // 1. Garantir que as colunas existam antes da inserção
    const { ensureVeiculosAdminSchema } = await import("./src/db/admin-veiculos.server");
    const { ensurePerfilSchema } = await import("./src/db/perfil.server");
    await ensurePerfilSchema();
    await ensureVeiculosAdminSchema();

    // 2. Buscar um admin para ser o vendedor/responsável
    const adminRes = await db.execute(sql`SELECT id FROM profiles WHERE role = 'admin' LIMIT 1`);
    const adminRows = (adminRes as any).rows || adminRes;
    const adminId = adminRows[0]?.id;

    if (!adminId) {
      console.error("Nenhum admin encontrado para associar ao veículo.");
      process.exit(1);
    }

    console.log("Usando Admin ID:", adminId);

    // 3. Inserir/Atualizar o veículo
    await db.execute(sql`
      INSERT INTO veiculos (
        id, placa, marca, modelo, status, status_analise, 
        perfil_id, vendedor_id, renavam, cor, km, criado_em, atualizado_em
      ) VALUES (
        ${onixId}::uuid, 'ABS1245', 'CHEVROLET', 'ONIX', 'AGUARDANDO_ANALISE', 'AGUARDANDO_ANALISE',
        ${adminId}::uuid, ${adminId}::uuid, '123456789', 'Branco', 15000, now(), now()
      )
      ON CONFLICT (id) DO UPDATE SET 
        status_analise = 'AGUARDANDO_ANALISE',
        atualizado_em = now();
    `);

    console.log("✅ Veículo Onix (ABS1245) garantido com sucesso.");
  } catch (e) {
    console.error("❌ Erro no seed:", e);
  }
  process.exit(0);
}
run();
