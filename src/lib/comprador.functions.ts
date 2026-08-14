import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db/index";
import { sql } from "drizzle-orm";
import { hashPassword, issueToken } from "../db/auth.server";

export const updateInteressesFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data, context }) => {
    if (!db) throw new Error("DB offline");
    const userId = (context as any).userId;
    if (!userId) throw new Error("Não autorizado");

    await db.execute(sql`
      UPDATE profiles SET
        interesses_veiculos = ${JSON.stringify(data.veiculos)}::jsonb,
        interesses_marcas = ${JSON.stringify(data.marcas)}::jsonb,
        pode_receber_comunicacoes = ${data.receberWhatsApp},
        atualizado_em = now()
      WHERE id = ${userId}::uuid
    `);

    return { ok: true };
  });

export const getInteressesFn = createServerFn({ method: "GET" })
  .handler(async ({ context }) => {
    if (!db) throw new Error("DB offline");
    const userId = (context as any).userId;
    if (!userId) throw new Error("Não autorizado");

    const res = await db.execute(sql`
      SELECT interesses_veiculos, interesses_marcas, pode_receber_comunicacoes
      FROM profiles WHERE id = ${userId}::uuid
    `);
    
    return (res as any).rows?.[0] || {};
  });

export const cadastrarCompradorFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    if (!db) throw new Error("DB offline");
    
    const senhaHash = await hashPassword(data.password); // form field is 'password'
    
    const res = await db.execute(sql`
      INSERT INTO profiles (nome, email, whatsapp, cpf, role, senha_hash, tipo_pessoa, cep, endereco, cidade, uf)
      VALUES (
        ${data.nome}, 
        ${data.email}, 
        ${data.whatsapp}, 
        ${data.cpf || data.cnpj}, 
        'comprador', 
        ${senhaHash},
        ${data.tipo},
        ${data.cep || ''},
        ${data.endereco || ''},
        ${data.cidade || ''},
        ${data.uf || ''}
      )
      RETURNING id, nome, email, role
    `);
    
    const user = (res as any).rows?.[0];
    if (!user) throw new Error("Erro ao criar usuário");
    
    const accessToken = await issueToken(user.id);
    
    return { 
      ok: true, 
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      accessToken 
    };
  });

export const getStatusCompradorFn = createServerFn({ method: "GET" })
  .validator((data: any) => data)
  .handler(async ({ context }) => {
    if (!db) throw new Error("DB offline");
    const userId = (context as any).userId;
    if (!userId) throw new Error("Não autorizado");

    const res = await db.execute(sql`
      SELECT cadastro_completo, ativo, whatsapp_status, pode_receber_comunicacoes
      FROM profiles WHERE id = ${userId}::uuid
    `);
    return (res as any).rows?.[0];
  });

export const enviarDocumentoCompradorFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data, context }) => {
    if (!db) throw new Error("DB offline");
    const userId = (context as any).userId;
    if (!userId) throw new Error("Não autorizado");

    const column = data.tipo === 'CNH' || data.tipo === 'CNH_RG' ? 'documento_cnh_url' : 
                   data.tipo === 'CRLV' || data.tipo === 'CONTRATO_SOCIAL' ? 'documento_crlv_url' : 'documento_selfie_url';

    await db.execute(sql.raw(`
      UPDATE profiles SET ${column} = '${data.url}', atualizado_em = now() WHERE id = '${userId}'
    `));

    return { ok: true };
  });
