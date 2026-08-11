import { sql } from "drizzle-orm";
import { db } from "./index";
import { RegraNegocioError, type Row } from "./cadastro.server";
import { obterLaudo } from "./laudos.server";

function requireDb() {
  if (!db) throw new RegraNegocioError("Banco de dados indisponível.", 503);
  return db;
}

export async function getConfig(chave: string, padrao: string) {
  const d = requireDb();
  const rows = (await d.execute(sql`SELECT valor FROM configuracoes WHERE chave = ${chave}`)) as unknown as Array<{ valor: string }>;
  return rows[0]?.valor ?? padrao;
}

export async function calcularDepreciacao(veiculoId: string, usuarioId?: string | null) {
  const d = requireDb();
  
  // 1. Obter dados do veículo e último laudo enviado
  const veiculos = (await d.execute(sql`SELECT * FROM veiculos WHERE id = ${veiculoId} LIMIT 1`)) as unknown as Array<Row>;
  const veiculo = veiculos[0];
  if (!veiculo) throw new RegraNegocioError("Veículo não encontrado.", 404);

  const laudos = (await d.execute(sql`
    SELECT id FROM laudos WHERE veiculo_id = ${veiculoId} AND status = 'ENVIADO' 
    ORDER BY enviado_em DESC LIMIT 1
  `)) as unknown as Array<{ id: string }>;
  const laudoId = laudos[0]?.id;
  if (!laudoId) throw new RegraNegocioError("Veículo sem laudo enviado para cálculo.", 422);

  const dadosLaudo = await obterLaudo(laudoId);
  const valorFipe = Number(veiculo["valor_fipe"] || 0);
  let valorFinal = valorFipe;
  const detalhamento: Array<any> = [];

  // 2. Ajuste de KM
  const kmMediaAnual = Number(await getConfig("km_media_anual", "12000"));
  const idade = Math.max(1, new Date().getFullYear() - Number(veiculo["ano_modelo"] || new Date().getFullYear()));
  const kmEsperada = kmMediaAnual * idade;
  const kmReal = Number(veiculo["km"] || 0);
  const diffKm = kmReal - kmEsperada;

  if (diffKm > 0) {
    // Excedente: 1% de desconto a cada 10.000km excedentes
    const descPercent = (diffKm / 10000) * 1; 
    const valorDesc = (valorFipe * descPercent) / 100;
    valorFinal -= valorDesc;
    detalhamento.push({ titulo: "Ajuste KM (Excesso)", tipo: "DESCONTO", valor: valorDesc, info: `${diffKm}km acima do esperado` });
  } else if (diffKm < 0) {
    // Abaixo da média: 0.5% de acréscimo a cada 10.000km, teto 5%
    const bonusPercent = Math.min(5, (Math.abs(diffKm) / 10000) * 0.5);
    const valorBonus = (valorFipe * bonusPercent) / 100;
    valorFinal += valorBonus;
    detalhamento.push({ titulo: "Bônus KM (Baixa Rodagem)", tipo: "ACRESCIMO", valor: valorBonus, info: `${Math.abs(diffKm)}km abaixo do esperado` });
  }

  // 3. Descontos por item (Checklist)
  const regras = (await d.execute(sql`SELECT * FROM depreciacao_regras WHERE ativo = true`)) as unknown as Array<Row>;
  
  for (const resp of dadosLaudo.respostas) {
    const item = dadosLaudo.itens.find(i => String(i["id"]) === String(resp["item_id"]));
    if (!item) continue;

    // Busca regra pelo item_id ou pelo título (fallback)
    const regra = regras.find(r => 
      String(r["item_id"]) === String(item["id"]) || 
      String(item["titulo"]).toUpperCase().includes(String(r["resposta"] || "").toUpperCase())
    );

    if (regra && String(resp["resposta"]).toUpperCase() === "AVARIA") {
      let valorBase = Number(regra["valor"]);
      const gravidade = String(resp["gravidade"]).toUpperCase();
      let fator = 1.0;
      if (gravidade === "LEVE") fator = Number(regra["fator_leve"] || 0.6);
      if (gravidade === "MEDIA") fator = Number(regra["fator_media"] || 1.0);
      if (gravidade === "GRAVE") fator = Number(regra["fator_grave"] || 1.8);

      let desc = 0;
      if (regra["tipo_desconto"] === "PERCENTUAL") {
        desc = (valorFipe * (valorBase * fator)) / 100;
      } else {
        desc = valorBase * fator;
      }

      valorFinal -= desc;
      detalhamento.push({ 
        titulo: `Avaria: ${item["titulo"]}`, 
        tipo: "DESCONTO", 
        valor: desc, 
        info: `Gravidade ${gravidade} (Fator ${fator})` 
      });
    }
  }

  // 4. Valorização por acessórios
  let valorizaTotal = 0;
  for (const acc of dadosLaudo.acessorios) {
    if (String(acc["estado"]) === "FUNCIONANDO") {
      // Regra genérica: +0.2% por acessório funcionando
      const bonus = (valorFipe * 0.2) / 100;
      valorizaTotal += bonus;
    }
  }
  if (valorizaTotal > 0) {
    valorFinal += valorizaTotal;
    detalhamento.push({ titulo: "Acessórios Funcionando", tipo: "ACRESCIMO", valor: valorizaTotal });
  }

  // 5. Tetos
  const tetoGlobalPercent = Number(await getConfig("teto_global_depreciacao", "45"));
  const maxDepreciacao = (valorFipe * tetoGlobalPercent) / 100;
  const depreciacaoTotal = valorFipe - valorFinal;
  let foraDaCurva = false;

  if (depreciacaoTotal > maxDepreciacao) {
    foraDaCurva = true;
    valorFinal = valorFipe - maxDepreciacao;
    detalhamento.push({ titulo: "Ajuste Teto Global", tipo: "TETO", valor: depreciacaoTotal - maxDepreciacao, info: `Depreciação limitada a ${tetoGlobalPercent}%` });
  }

  // 6. Margem Alvo
  const margemPercent = Number(await getConfig("margem_alvo", "8"));
  const valorMargem = (valorFinal * margemPercent) / 100;
  const valorSugerido = valorFinal - valorMargem;
  detalhamento.push({ titulo: "Margem Operacional", tipo: "MARGEM", valor: valorMargem, info: `${margemPercent}% do valor ajustado` });

  // Gravar cálculo
  const rows = (await d.execute(sql`
    INSERT INTO depreciacao_calculos (laudo_id, veiculo_id, usuario_id, valor_fipe, valor_final, detalhamento, fora_da_curva)
    VALUES (${laudoId}, ${veiculoId}, ${usuarioId ?? null}, ${valorFipe}, ${valorSugerido}, ${JSON.stringify(detalhamento)}::jsonb, ${foraDaCurva})
    RETURNING *;
  `)) as unknown as Array<Row>;

  return rows[0];
}

export async function obterHistoricoDepreciacao(veiculoId: string) {
  const d = requireDb();
  return (await d.execute(sql`
    SELECT c.*, p.nome as usuario_nome
    FROM depreciacao_calculos c
    LEFT JOIN profiles p ON p.id = c.usuario_id
    WHERE veiculo_id = ${veiculoId}
    ORDER BY criado_em DESC
  `)) as unknown as Array<Row>;
}
