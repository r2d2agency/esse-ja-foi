import { sql } from "drizzle-orm";
import { db } from "./index";

const DEFAULT_GRAPH_VERSION = 'v20.0';

export class MetaWhatsAppService {
  private config: any = null;

  async init() {
    if (!db) return;
    const res = await db.execute(sql`SELECT * FROM whatsapp_config LIMIT 1`);
    this.config = (res as any).rows?.[0];
  }

  private getGraphUrl(endpoint: string) {
    const version = this.config?.graph_api_version || DEFAULT_GRAPH_VERSION;
    return `https://graph.facebook.com/${version}/${endpoint}`;
  }

  private async fetchMeta(endpoint: string, options: RequestInit = {}) {
    if (!this.config?.access_token) {
      throw new Error("Token de acesso do WhatsApp não configurado.");
    }

    const url = this.getGraphUrl(endpoint);
    const headers = {
      'Authorization': `Bearer ${this.config.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      console.error("[Meta API Error]", data);
      throw new Error(data.error?.message || "Erro na comunicação com a API da Meta.");
    }

    return data;
  }

  async testarConexao() {
    await this.init();
    if (!this.config?.phone_number_id) {
      throw new Error("Phone Number ID não configurado.");
    }

    try {
      // Tenta buscar informações básicas do número para validar credenciais
      const data = await this.fetchMeta(this.config.phone_number_id);
      
      // Se chegou aqui, as credenciais básicas funcionam
      await db.execute(sql`
        UPDATE whatsapp_config SET 
          status = 'CONECTADO', 
          ultimo_teste = now(),
          detalhes_erro = null
        WHERE id = ${this.config.id}
      `);

      return { ok: true, data };
    } catch (error: any) {
      await db.execute(sql`
        UPDATE whatsapp_config SET 
          status = 'ERRO', 
          ultimo_teste = now(),
          detalhes_erro = ${error.message}
        WHERE id = ${this.config.id}
      `);
      throw error;
    }
  }

  async buscarDadosAutomaticos() {
    await this.init();
    if (!this.config?.phone_number_id) throw new Error("Phone Number ID ausente.");

    // Busca detalhes do número e da WABA
    const phoneData = await this.fetchMeta(this.config.phone_number_id);
    
    // Se o token tiver permissão, buscamos os templates para validar acesso
    try {
      if (this.config.waba_id) {
        await this.fetchMeta(`${this.config.waba_id}/message_templates?limit=1`);
      }
    } catch (e) {}

    return phoneData;
  }

  async sincronizarTemplates() {
    await this.init();
    if (!this.config?.waba_id) throw new Error("WABA ID não configurado.");

    const data = await this.fetchMeta(`${this.config.waba_id}/message_templates`);
    const templates = data.data || [];

    for (const t of templates) {
      await db.execute(sql`
        INSERT INTO whatsapp_templates (
          meta_id, 
          nome_interno, 
          meta_name, 
          categoria, 
          idioma, 
          status, 
          conteudo,
          ultima_sincronizacao
        )
        VALUES (
          ${t.id}, 
          ${t.name}, 
          ${t.name}, 
          ${t.category}, 
          ${t.language}, 
          ${t.status}, 
          ${JSON.stringify(t.components)}::jsonb,
          now()
        )
        ON CONFLICT (meta_name) DO UPDATE SET
          status = EXCLUDED.status,
          conteudo = EXCLUDED.conteudo,
          ultima_sincronizacao = now();
      `);
    }

    return templates.length;
  }
}

export const metaService = new MetaWhatsAppService();
