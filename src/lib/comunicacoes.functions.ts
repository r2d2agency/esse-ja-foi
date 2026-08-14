import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as db from "../db/comunicacoes.server";

export const getWhatsappConfigFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return db.getWhatsappConfig();
  });

export const updateWhatsappConfigFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    return db.updateWhatsappConfig(data);
  });

export const listarTemplatesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return db.listarTemplates();
  });

export const listarSegmentosFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return db.listarSegmentos();
  });

export const listarCampanhasFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return db.listarCampanhas();
  });

export const getIndicadoresComunicacoesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return db.getIndicadoresComunicacoes();
  });

export const testarConexaoFn = createServerFn({ method: "POST" })
  .handler(async () => {
    // Simular teste de conexão com Meta API
    const config = await db.getWhatsappConfig();
    if (!config || !config.access_token) {
      return { ok: false, error: "Token de acesso ausente." };
    }
    
    // Aqui faria uma chamada real para a API da Meta: /me/whatsapp_business_accounts
    // Por enquanto, simulamos sucesso se houver token
    return { ok: true, message: "WhatsApp conectado" };
  });

export const sincronizarTemplatesFn = createServerFn({ method: "POST" })
  .handler(async () => {
    // Simular sincronização com Meta API
    // Retornaria templates reais da Meta e salvaria no banco
    return { ok: true, count: 0 };
  });
