import { sql, eq, and } from "drizzle-orm";
import { db } from "./index";

function requireDb() {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

export async function ensureComunicacoesSchema(silent = true) {
  const d = requireDb();
  if (!silent && process.env['NODE_ENV'] === 'development') console.log("[comunicacoes.server] Garantindo tabelas de comunicação...");

  try {
    // 1. Configurações WhatsApp Meta
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        waba_id text,
        phone_number_id text,
        business_id text,
        phone_number text,
        access_token text, -- Manter no backend
        webhook_verify_token text,
        status text DEFAULT 'DESCONECTADO', -- CONECTADO, DESCONECTADO, ERRO
        ultimo_teste timestamptz,
        detalhes_erro text,
        atualizado_em timestamptz DEFAULT now()
      );
    `);

    // Inserir config padrão se não existir
    await d.execute(sql`
      INSERT INTO whatsapp_config (id)
      SELECT gen_random_uuid()
      WHERE NOT EXISTS (SELECT 1 FROM whatsapp_config);
    `);

    // 2. Templates WhatsApp (Sincronizados da Meta)
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_interno text NOT NULL,
        meta_name text UNIQUE NOT NULL,
        categoria text, -- MARKETING, UTILITY, AUTHENTICATION
        idioma text DEFAULT 'pt_BR',
        conteudo jsonb, -- Estrutura do template (cabeçalho, corpo, botões)
        status text DEFAULT 'PENDENTE', -- APROVADO, REJEITADO, PENDENTE, PAUSADO
        tipo_midia text, -- TEXT, IMAGE, VIDEO, DOCUMENT
        meta_id text,
        ultima_sincronizacao timestamptz DEFAULT now(),
        criado_em timestamptz DEFAULT now()
      );
    `);

    // 3. Segmentos (Listas de Compradores)
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_segmentos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        descricao text,
        tipo text NOT NULL DEFAULT 'DINAMICO', -- DINAMICO, MANUAL
        filtros jsonb, -- Para segmentos dinâmicos
        total_contatos integer DEFAULT 0,
        criado_em timestamptz DEFAULT now(),
        atualizado_em timestamptz DEFAULT now()
      );
    `);

    // 4. Join table para segmentos manuais
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_segmentos_contatos (
        segmento_id uuid REFERENCES whatsapp_segmentos(id) ON DELETE CASCADE,
        comprador_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
        PRIMARY KEY (segmento_id, comprador_id)
      );
    `);

    // 5. Campanhas WhatsApp
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_campanhas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        veiculo_id uuid REFERENCES veiculos(id),
        template_id uuid REFERENCES whatsapp_templates(id),
        status text DEFAULT 'RASCUNHO', -- RASCUNHO, AGENDADA, PROCESSANDO, CONCLUIDA, CANCELADA
        agendado_para timestamptz,
        iniciado_em timestamptz,
        concluido_em timestamptz,
        total_destinatarios integer DEFAULT 0,
        total_enviados integer DEFAULT 0,
        total_entregues integer DEFAULT 0,
        total_lidos integer DEFAULT 0,
        total_falhas integer DEFAULT 0,
        total_cliques integer DEFAULT 0,
        criado_por uuid REFERENCES profiles(id),
        criado_em timestamptz DEFAULT now(),
        atualizado_em timestamptz DEFAULT now()
      );
    `);

    // 6. Mensagens Individuais (Fila e Histórico)
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_mensagens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id uuid REFERENCES whatsapp_campanhas(id) ON DELETE CASCADE,
        comprador_id uuid REFERENCES profiles(id),
        telefone text NOT NULL,
        status text DEFAULT 'NA_FILA', -- NA_FILA, ENVIADA, ENTREGUE, LIDA, FALHOU, CANCELADA
        meta_message_id text UNIQUE, -- ID retornado pela Meta
        erro_codigo text,
        erro_mensagem text,
        enviado_em timestamptz,
        entregue_em timestamptz,
        lido_em timestamptz,
        clicado_em timestamptz,
        payload jsonb, -- Dados enviados (variáveis)
        criado_em timestamptz DEFAULT now(),
        atualizado_em timestamptz DEFAULT now()
      );
    `);
    await d.execute(sql`CREATE INDEX IF NOT EXISTS idx_wa_mensagens_campanha ON whatsapp_mensagens(campanha_id);`);
    await d.execute(sql`CREATE INDEX IF NOT EXISTS idx_wa_mensagens_status ON whatsapp_mensagens(status);`);

    // 7. Logs de Auditoria
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campanha_id uuid REFERENCES whatsapp_campanhas(id) ON DELETE SET NULL,
        mensagem_id uuid REFERENCES whatsapp_mensagens(id) ON DELETE SET NULL,
        acao text NOT NULL,
        detalhe text,
        usuario_id uuid REFERENCES profiles(id),
        payload jsonb,
        criado_em timestamptz DEFAULT now()
      );
    `);

    // 8. Atualizar profiles com preferências e elegibilidade
    const profileCols: Array<[string, string]> = [
      ["pode_receber_comunicacoes", "boolean DEFAULT true"],
      ["whatsapp_status", "text DEFAULT 'ATIVO'"], // ATIVO, INVALIDO, DESABILITADO, BLOQUEADO, DESCADASTRADO
      ["whatsapp_validado_em", "timestamptz"],
      ["interesses_veiculos", "jsonb DEFAULT '[]'"], // Hatch, Sedan, SUV, etc.
      ["interesses_marcas", "jsonb DEFAULT '[]'"],
      ["interesses_regioes", "jsonb DEFAULT '[]'"],
      ["interesses_anos", "jsonb DEFAULT '[]'"]
    ];

    for (const [name, type] of profileCols) {
      try {
        await d.execute(sql.raw(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${name} ${type};`));
      } catch (e) {}
    }

    if (!silent && process.env['NODE_ENV'] === 'development') console.log("[comunicacoes.server] Tabelas OK.");
  } catch (err) {
    console.error("[comunicacoes.server] Erro ao garantir tabelas:", err);
    throw err;
  }
}

// Functions to be implemented
export async function getWhatsappConfig() {
  const d = requireDb();
  const res = await d.execute(sql`SELECT * FROM whatsapp_config LIMIT 1`);
  return (res as any).rows?.[0] || null;
}

export async function updateWhatsappConfig(config: any) {
  const d = requireDb();
  await d.execute(sql`
    UPDATE whatsapp_config SET
      waba_id = ${config.waba_id},
      phone_number_id = ${config.phone_number_id},
      business_id = ${config.business_id},
      phone_number = ${config.phone_number},
      access_token = ${config.access_token},
      status = 'DESCONECTADO',
      atualizado_em = now()
    WHERE id = (SELECT id FROM whatsapp_config LIMIT 1)
  `);
  return { ok: true };
}

export async function listarTemplates() {
  const d = requireDb();
  const res = await d.execute(sql`SELECT * FROM whatsapp_templates ORDER BY meta_name`);
  return (res as any).rows || [];
}

export async function listarSegmentos() {
  const d = requireDb();
  const res = await d.execute(sql`SELECT * FROM whatsapp_segmentos ORDER BY nome`);
  return (res as any).rows || [];
}

export async function listarCampanhas() {
  const d = requireDb();
  const res = await d.execute(sql`
    SELECT c.*, v.marca, v.modelo, t.nome_interno as template_nome
    FROM whatsapp_campanhas c
    LEFT JOIN veiculos v ON v.id = c.veiculo_id
    LEFT JOIN whatsapp_templates t ON t.id = c.template_id
    ORDER BY c.criado_em DESC
  `);
  return (res as any).rows || [];
}

export async function getIndicadoresComunicacoes() {
  const d = requireDb();
  const res = await d.execute(sql`
    SELECT
      (SELECT count(*) FROM whatsapp_campanhas) as total_campanhas,
      (SELECT count(*) FROM whatsapp_mensagens WHERE status = 'ENVIADA') as total_enviadas,
      (SELECT count(*) FROM whatsapp_mensagens WHERE status = 'LIDA') as total_lidas,
      (SELECT count(*) FROM profiles WHERE role = 'comprador' AND pode_receber_comunicacoes = true) as compradores_elegiveis
  `);
  return (res as any).rows?.[0] || {};
}
