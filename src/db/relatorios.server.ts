import { sql } from "drizzle-orm";
import { db } from "./index";

export async function ensureRelatoriosSchema() {
  if (!db) return;
  // This is a view/read-only module, but we might need a table for saved reports in the future.
  // For now, we just ensure existing tables used in reports are indexed if needed.
}

export async function getRelatoriosGerais(filtros: { dataInicio?: string | null; dataFim?: string | null }) {
  if (!db) return null;

  const whereClause = filtros.dataInicio && filtros.dataFim 
    ? sql`WHERE criado_em BETWEEN ${filtros.dataInicio} AND ${filtros.dataFim}`
    : sql``;

  // 1. Visão Geral
  const stats = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM veiculos ${whereClause}) as veiculos_cadastrados,
      (SELECT count(*) FROM veiculos WHERE status_analise = 'PRONTO_PARA_VISTORIA' ${whereClause ? sql` AND criado_em BETWEEN ${filtros.dataInicio} AND ${filtros.dataFim}` : sql``}) as veiculos_aprovados,
      (SELECT count(*) FROM anuncios_veiculo ${whereClause}) as veiculos_publicados,
      (SELECT count(*) FROM leiloes WHERE status = 'encerrado' ${whereClause}) as leiloes_realizados,
      (SELECT count(*) FROM negociacoes WHERE status = 'CONCLUIDA' ${whereClause}) as vendas_concluidas,
      (SELECT COALESCE(SUM(valor_venda), 0) FROM negociacoes WHERE status = 'CONCLUIDA' ${whereClause}) as volume_vendido,
      (SELECT COALESCE(SUM(valor_comissao), 0) FROM negociacoes WHERE status = 'CONCLUIDA' ${whereClause}) as comissao_gerada,
      (SELECT count(*) FROM profiles WHERE role = 'comprador' AND ativo = true ${whereClause}) as compradores_ativos,
      (SELECT count(*) FROM profiles WHERE role = 'vendedor' ${whereClause}) as vendedores_cadastrados
  `);

  // 2. Funil de Operação
  const funnel = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM veiculos ${whereClause}) as cadastrados,
      (SELECT count(*) FROM veiculos WHERE status = 'ANALISE' ${whereClause}) as em_analise,
      (SELECT count(*) FROM veiculos WHERE status_analise = 'PRONTO_PARA_VISTORIA' ${whereClause}) as aprovados_vistoria,
      (SELECT count(*) FROM vistorias WHERE status = 'CONCLUIDA' ${whereClause}) as vistoriados,
      (SELECT count(*) FROM veiculos WHERE status = 'PRONTO_PARA_ANUNCIO' ${whereClause}) as prontos_anuncio,
      (SELECT count(*) FROM anuncios_veiculo ${whereClause}) as publicados,
      (SELECT count(DISTINCT leilao_id) FROM leiloes_lances ${whereClause}) as com_lances,
      (SELECT count(*) FROM negociacoes ${whereClause}) as com_vencedor,
      (SELECT count(*) FROM cobrancas WHERE status = 'PAGO' ${whereClause}) as pagos,
      (SELECT count(*) FROM entregas WHERE status = 'ENTREGA_CONFIRMADA' ${whereClause}) as entregues,
      (SELECT count(*) FROM negociacoes WHERE status = 'CONCLUIDA' ${whereClause}) as concluidos
  `);

  return {
    overview: (stats as any).rows?.[0] || (stats as any)[0],
    funnel: (funnel as any).rows?.[0] || (funnel as any)[0]
  };
}

export async function getRelatoriosVendas(filtros: { dataInicio?: string | null; dataFim?: string | null }) {
  if (!db) return null;
  const whereClause = filtros.dataInicio && filtros.dataFim 
    ? sql`WHERE n.criado_em BETWEEN ${filtros.dataInicio} AND ${filtros.dataFim}`
    : sql``;

  const stats = await db.execute(sql`
    SELECT 
      count(*) as total_vendas,
      SUM(valor_venda) as volume_total,
      AVG(valor_venda) as ticket_medio,
      MAX(valor_venda) as maior_venda,
      SUM(valor_comissao) as comissao_total,
      AVG(valor_comissao) as comissao_media
    FROM negociacoes n
    WHERE n.status = 'CONCLUIDA' 
    ${filtros.dataInicio && filtros.dataFim ? sql` AND n.criado_em BETWEEN ${filtros.dataInicio} AND ${filtros.dataFim}` : sql``}
  `);

  const lista = await db.execute(sql`
    SELECT 
      n.criado_em, n.codigo, v.marca || ' ' || v.modelo as veiculo,
      vend.nome as vendedor_nome, comp.nome as comprador_nome,
      n.valor_venda, n.valor_comissao, (n.valor_venda - n.valor_comissao) as valor_repassado,
      n.status
    FROM negociacoes n
    JOIN veiculos v ON v.id = n.veiculo_id
    JOIN profiles vend ON vend.id = n.vendedor_id
    JOIN profiles comp ON comp.id = n.comprador_id
    ${whereClause}
    ORDER BY n.criado_em DESC
    LIMIT 100
  `);

  return {
    stats: (stats as any).rows?.[0] || (stats as any)[0],
    lista: (lista as any).rows || lista
  };
}
