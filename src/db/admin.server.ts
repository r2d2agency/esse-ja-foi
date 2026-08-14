import { sql } from "drizzle-orm";
import { db } from "./index";

export type Row = Record<string, any>;

function requireDb() {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function ensureAdminTables() {
  const d = requireDb();
  console.log("[admin.server] Garantindo tabelas admin...");
  try {
    // Tabela de configurações
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS configuracoes_sistema (
        chave text PRIMARY KEY,
        valor text NOT NULL,
        descricao text,
        atualizado_em timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Tabela de logs (se não existir, embora já devesse existir pela migration)
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        entidade text NOT NULL,
        acao text NOT NULL,
        detalhe text,
        usuario text,
        criado_em timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Sementes iniciais
    await d.execute(sql`
      INSERT INTO configuracoes_sistema (chave, valor, descricao)
      VALUES 
        ('smtp_host', '', 'Host do servidor SMTP'),
        ('smtp_port', '587', 'Porta do servidor SMTP'),
        ('smtp_user', '', 'Usuário do servidor SMTP'),
        ('smtp_pass', '', 'Senha do servidor SMTP'),
        ('openai_api_key', '', 'Chave de API da OpenAI'),
        ('openai_model', 'gpt-4o', 'Modelo da OpenAI a ser utilizado')
      ON CONFLICT (chave) DO NOTHING;
    `);
    console.log("[admin.server] Tabelas admin OK.");
  } catch (err) {
    console.error("[admin.server] Erro ao garantir tabelas admin:", err);
    throw err;
  }
}

export async function checkSystemHealth() {
  const d = requireDb();
  const tables = ['profiles', 'veiculos', 'agendamentos', 'clientes', 'laudos', 'logs', 'configuracoes_sistema'];
  const health: Record<string, boolean> = {};
  
  for (const table of tables) {
    try {
      const res = await d.execute(sql`SELECT 1 FROM ${sql.identifier(table)} LIMIT 1`);
      health[table] = true;
    } catch (e) {
      health[table] = false;
      console.warn(`[health] Tabela ${table} não acessível:`, (e as Error).message);
    }
  }
  
  return health;
}

export async function listarVendedoresPendentes() {
  const d = requireDb();
  const rows = await d.execute(sql`
    SELECT id, nome, email, whatsapp, cpf, cidade, uf, ativo, cadastro_completo, criado_em, documento_cnh_url, documento_crlv_url, documento_selfie_url
    FROM profiles 
    WHERE role = 'vendedor'::app_role
    ORDER BY criado_em DESC;
  `);
  return (rows as any).rows || rows;
}

export async function listarCompradores() {
  const d = requireDb();
  const rows = await d.execute(sql`
    SELECT id, nome, email, whatsapp, cpf, cidade, uf, ativo, criado_em
    FROM profiles 
    WHERE role = 'comprador'::app_role
    ORDER BY criado_em DESC;
  `);
  return (rows as any).rows || rows;
}

export async function alterarStatusUsuario(userId: string, ativo: boolean) {
  const d = requireDb();
  await d.execute(sql`
    UPDATE profiles SET ativo = ${ativo}, atualizado_em = now() WHERE id = ${userId}::uuid;
  `);
  return { ok: true };
}

export async function listarConfiguracoes() {
  const d = requireDb();
  const rows = await d.execute(sql`SELECT * FROM configuracoes_sistema ORDER BY chave;`);
  return (rows as any).rows || rows;
}

export async function salvarConfiguracao(chave: string, valor: string) {
  const d = requireDb();
  await d.execute(sql`
    INSERT INTO configuracoes_sistema (chave, valor, atualizado_em)
    VALUES (${chave}, ${valor}, now())
    ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();
  `);
  return { ok: true };
}
