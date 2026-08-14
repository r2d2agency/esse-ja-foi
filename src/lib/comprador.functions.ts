import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db/index";
import { sql } from "drizzle-orm";

export const updateInteressesFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data, context }) => {
    // Aqui usaria o context do usuário logado para atualizar seu profile
    // Por enquanto simulamos a lógica de banco
    if (!db) throw new Error("DB offline");
    
    // Supondo que temos o userId no context (requireSupabaseAuth deve estar configurado)
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
