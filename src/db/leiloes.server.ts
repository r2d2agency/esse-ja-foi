import { db } from "./index";
import { leiloes, lances, veiculos, profiles } from "./schema";
import { eq, and, gt, desc } from "drizzle-orm";

export const listarLeiloesAtivos = async () => {
  if (!db) return { ok: false, message: "Banco não conectado" };
  
  try {
    const agora = new Date();
    const result = await db.query.leiloes.findMany({
      where: and(
        eq(leiloes.status, 'ativo'),
        gt(leiloes.fim_em, agora)
      ),
      with: {
        veiculo: true,
        lances: {
          orderBy: [desc(lances.valor)],
          limit: 1
        }
      }
    });
    return { ok: true, data: result };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
};

export const obterDetalhesLeilao = async (id: string) => {
  if (!db) return { ok: false, message: "Banco não conectado" };
  
  try {
    const result = await db.query.leiloes.findFirst({
      where: eq(leiloes.id, id),
      with: {
        veiculo: true,
        lances: {
          orderBy: [desc(lances.valor)],
          with: {
            comprador: true
          }
        }
      }
    });
    return { ok: true, data: result };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
};

export const registrarLance = async (leilaoId: string, valor: string) => {
  if (!db) return { ok: false, message: "Banco não conectado" };
  
  try {
    // Aqui deveria haver validação de role e se o comprador está verificado
    // E validação se o valor é maior que o lance atual
    
    // Simplificado para a primeira entrega
    await db.insert(lances).values({
      leilao_id: leilaoId,
      comprador_id: '00000000-0000-0000-0000-000000000000', // Placeholder até ter o auth context injetado
      valor: valor
    });
    
    return { ok: true, message: "Lance registrado com sucesso" };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
};
