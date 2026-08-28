import { sql } from "drizzle-orm";
import { db } from "./index";

export type Row = Record<string, any>;
export type HorarioPeriodo = {
  inicio: string;
  fim: string;
};

function requireDb() {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
}

function toMinutes(value: string) {
  const [hora, minuto] = String(value || "00:00").split(":").map(Number);
  return (hora || 0) * 60 + (minuto || 0);
}

function minutesToTime(value: number) {
  const hora = Math.floor(value / 60);
  const minuto = value % 60;
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

const TIMEZONE_SP = "America/Sao_Paulo";

function dataFormatadaSP(offsetDias: number = 0): string {
  const agora = new Date();
  const sp = new Date(agora.toLocaleString("en-US", { timeZone: TIMEZONE_SP }));
  if (offsetDias !== 0) sp.setDate(sp.getDate() + offsetDias);
  const ano = sp.getFullYear();
  const mes = String(sp.getMonth() + 1).padStart(2, "0");
  const dia = String(sp.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
function minutosAgoraSP(): number {
  const agora = new Date();
  const partes = agora.toLocaleString("en-US", {
    timeZone: TIMEZONE_SP,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const match = partes.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    const fallback = new Date();
    return fallback.getHours() * 60 + fallback.getMinutes();
  }
  return Number(match[1]) * 60 + Number(match[2]);
}
function ehHojeSP(dataIso: string): boolean {
  return dataIso === dataFormatadaSP(0);
}
function dataEstaNoPassado(dataIso: string): boolean {
  const hojeSP = dataFormatadaSP(0);
  return dataIso < hojeSP;
}

function normalizarUuid(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match?.[0]?.toLowerCase() || null;
}

async function encontrarUnidadeRobusta(args: {
  unidadeId?: unknown;
  nomeUnidade?: string | null;
  cidadeUnidade?: string | null;
  campos?: string;
}): Promise<any> {
  const d = requireDb();
  const rawId = String(args.unidadeId ?? "").trim();
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const unidadeIdLower = (uuidMatch?.[0] ?? rawId).toLowerCase();
  const nomeFiltro = String(args.nomeUnidade ?? "").trim();
  const cidadeFiltro = String(args.cidadeUnidade ?? "").trim();
  const campos = args.campos || `
    id::text as id,
    ativo,
    duracao_padrao_minutos,
    intervalo_entre_vistorias_minutos,
    horario_atendimento,
    nome,
    cidade
  `;

  if (!rawId && !nomeFiltro) return null;

  const todasCandidatas: any[] = [];

  if (unidadeIdLower) {
    try {
      const porUuid = await d.execute(sql`
        SELECT ${sql.raw(campos)}, 0 as prioridade_busca
        FROM unidades_vistoria
        WHERE id::text ILIKE ${unidadeIdLower}
           OR id::text ILIKE (${unidadeIdLower} || '%')
        LIMIT 3
      `);
      for (const u of ((porUuid as any).rows || [])) todasCandidatas.push(u);
    } catch { /* ignora */ }

    if (todasCandidatas.length === 0 && unidadeIdLower.replace(/-/g, "").length >= 32) {
      try {
        const porCast = await d.execute(sql`
          SELECT ${sql.raw(campos)}, 0 as prioridade_busca
          FROM unidades_vistoria
          WHERE id = (${unidadeIdLower}::uuid)
          LIMIT 3
        `);
        for (const u of ((porCast as any).rows || [])) {
          if (!todasCandidatas.some((x) => String(x.id).toLowerCase() === String(u.id).toLowerCase())) {
            todasCandidatas.push(u);
          }
        }
      } catch { /* ignora */ }
    }
  }

  if (nomeFiltro) {
    try {
      const porNome = await d.execute(sql`
        SELECT ${sql.raw(campos)}, 1 as prioridade_busca
        FROM unidades_vistoria
        WHERE (
          lower(nome) ILIKE lower(('%' || ${nomeFiltro} || '%'))
          OR lower(nome) = lower(${nomeFiltro})
        )
        ${
          cidadeFiltro
            ? sql`AND (lower(cidade) ILIKE lower(('%' || ${cidadeFiltro} || '%')) OR lower(cidade) = lower(${cidadeFiltro}))`
            : sql``
        }
        ORDER BY ativo DESC, length(nome) ASC
        LIMIT 5
      `);
      for (const u of ((porNome as any).rows || [])) {
        if (!todasCandidatas.some((x) => String(x.id).toLowerCase() === String(u.id).toLowerCase())) {
          todasCandidatas.push(u);
        }
      }
    } catch { /* ignora */ }
  }

  if (todasCandidatas.length === 0) {
    try {
      const todas = await listarUnidadesDisponiveis();
      const lista: any[] = Array.isArray(todas) ? (todas as any[]) : (((todas as any)?.rows) as any[]) || [];
      for (const u of lista) {
        const idStr = String((u as any).id || "").toLowerCase();
        const nomeStr = String((u as any).nome || "").toLowerCase();
        const cidStr = String((u as any).cidade || "").toLowerCase();
        const bateId = unidadeIdLower && (
          idStr === unidadeIdLower ||
          idStr.replace(/-/g, "") === unidadeIdLower.replace(/-/g, "") ||
          idStr.startsWith(unidadeIdLower)
        );
        const bateNome = nomeFiltro && (
          nomeStr === nomeFiltro.toLowerCase() ||
          (cidadeFiltro && nomeStr.includes(nomeFiltro.toLowerCase()) &&
            cidStr.includes(cidadeFiltro.toLowerCase())) ||
          (!cidadeFiltro && nomeStr.includes(nomeFiltro.toLowerCase()))
        );
        if (bateId || bateNome) {
          todasCandidatas.push({ ...u, prioridade_busca: bateId ? 0 : 1 });
          if (todasCandidatas.length >= 3) break;
        }
      }
    } catch { /* ignora */ }
  }

  if (todasCandidatas.length === 0) return null;
  return todasCandidatas.sort((a, b) => Number(a.prioridade_busca ?? 9) - Number(b.prioridade_busca ?? 9))[0];
}

function normalizarHorarioAtendimento(value: any): Record<string, HorarioPeriodo[]> {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce<Record<string, HorarioPeriodo[]>>((acc, [dia, faixa]) => {
    if (Array.isArray(faixa)) {
      const periodos = faixa
        .filter((item) => item && typeof item === "object")
        .map((item: any) => ({
          inicio: typeof item.inicio === "string" ? item.inicio : "",
          fim: typeof item.fim === "string" ? item.fim : "",
        }))
        .filter((item) => item.inicio && item.fim);
      if (periodos.length > 0) acc[dia] = periodos;
      return acc;
    }

    if (!faixa || typeof faixa !== "object") return acc;
    const inicio = typeof (faixa as any).inicio === "string" ? (faixa as any).inicio : "";
    const fim = typeof (faixa as any).fim === "string" ? (faixa as any).fim : "";
    if (!inicio || !fim) return acc;
    acc[dia] = [{ inicio, fim }];
    return acc;
  }, {});
}

export async function ensureVistoriaSchema() {
  const d = requireDb();

  // 1. Unidades de Vistoria
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS unidades_vistoria (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      cnpj text,
      cep text,
      endereco text NOT NULL,
      cidade text NOT NULL,
      estado text NOT NULL,
      latitude numeric(10,7),
      longitude numeric(10,7),
      telefone text,
      whatsapp text,
      email text,
      responsavel text,
      horario_atendimento jsonb, -- { seg_sex: "08:00-18:00", sab: "08:00-12:00" }
      duracao_padrao_minutos integer DEFAULT 60,
      intervalo_entre_vistorias_minutos integer DEFAULT 30,
      raio_atendimento_km integer,
      cidades_atendidas text[],
      ativo boolean DEFAULT true,
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now()
    );
  `);

  await d.execute(sql`
    ALTER TABLE unidades_vistoria
    ADD COLUMN IF NOT EXISTS latitude numeric(10,7)
  `);

  await d.execute(sql`
    ALTER TABLE unidades_vistoria
    ADD COLUMN IF NOT EXISTS longitude numeric(10,7)
  `);

  await d.execute(sql`
    ALTER TABLE unidades_vistoria
    ADD COLUMN IF NOT EXISTS intervalo_entre_vistorias_minutos integer DEFAULT 30
  `);

  // 2. Vistoriadores (vinculados a perfis/usuários com role vistoriador)
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS vistoriadores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES profiles(id),
      unidade_id uuid REFERENCES unidades_vistoria(id),
      dias_trabalho integer[], -- [1,2,3,4,5] (segunda a sexta)
      horarios_disponiveis jsonb, -- { "1": ["08:00", "09:00", ...], ... }
      status text NOT NULL DEFAULT 'ATIVO', -- ATIVO, INATIVO, BLOQUEADO
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now(),
      UNIQUE(usuario_id)
    );
  `);

  // 3. Agendamentos
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS vistorias (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL REFERENCES veiculos(id),
      vendedor_id uuid NOT NULL REFERENCES profiles(id),
      unidade_id uuid NOT NULL REFERENCES unidades_vistoria(id),
      vistoriador_id uuid REFERENCES vistoriadores(id),
      data_vistoria date NOT NULL,
      horario_vistoria time NOT NULL,
      status text NOT NULL DEFAULT 'AGUARDANDO_CONFIRMACAO', 
      -- AGUARDANDO_CONFIRMACAO, CONFIRMADA, REAGENDAMENTO_SOLICITADO, CANCELADA, NAO_COMPARECEU_VENDEDOR, NAO_COMPARECEU_VISTORIADOR, EM_ANDAMENTO, CONCLUIDA
      motivo_cancelamento text,
      mensagem_vendedor text,
      confirmada_em timestamptz,
      criado_por uuid REFERENCES profiles(id),
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now()
    );
  `);

  // 4. Histórico/Timeline da Vistoria
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS vistorias_historico (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vistoria_id uuid NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
      acao text NOT NULL,
      detalhe text,
      usuario_id uuid REFERENCES profiles(id),
      criado_em timestamptz DEFAULT now()
    );
  `);

  // 5. Bloqueios de Agenda
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS vistorias_bloqueios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      unidade_id uuid REFERENCES unidades_vistoria(id),
      vistoriador_id uuid REFERENCES vistoriadores(id),
      data_inicio timestamptz NOT NULL,
      data_fim timestamptz NOT NULL,
      motivo text,
      criado_em timestamptz DEFAULT now()
    );
  `);

  // 6. Laudos
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS laudos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      vistoria_id uuid NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
      veiculo_id uuid NOT NULL REFERENCES veiculos(id),
      vistoriador_id uuid NOT NULL REFERENCES vistoriadores(id),
      status text NOT NULL DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO, CONCLUIDO
      quilometragem_atual integer,
      localizacao_checkin jsonb, -- { lat, lng, timestamp }
      placa_confirmada text,
      observacao_geral text,
      declaracao_vistoriador boolean DEFAULT false,
      concluido_em timestamptz,
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now(),
      UNIQUE(vistoria_id)
    );
  `);

  // 7. Laudo Checklist
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS laudo_checklist (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      laudo_id uuid NOT NULL REFERENCES laudos(id) ON DELETE CASCADE,
      etapa text NOT NULL, 
      item_chave text NOT NULL,
      status text NOT NULL, 
      observacao text,
      foto_url text,
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now(),
      UNIQUE(laudo_id, item_chave)
    );
  `);

  // 8. Laudo Fotos
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS laudo_fotos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      laudo_id uuid NOT NULL REFERENCES laudos(id) ON DELETE CASCADE,
      tipo_foto text NOT NULL, 
      url text NOT NULL,
      metadata jsonb,
      criado_em timestamptz DEFAULT now()
    );
  `);
}

// Server Functions para Admin e App Vistoriador

export async function listarVistoriasAdmin(filtros: any = {}) {
  const d = requireDb();
  await ensureVistoriaSchema();
  
  let query = sql`
    SELECT v.*, 
           vei.placa, vei.marca, vei.modelo,
           prof.nome as vendedor_nome, prof.whatsapp as vendedor_whatsapp,
           uv.nome as unidade_nome,
           pvist.nome as vistoriador_nome
    FROM vistorias v
    JOIN veiculos vei ON v.veiculo_id = vei.id
    JOIN profiles prof ON v.vendedor_id = prof.id
    JOIN unidades_vistoria uv ON v.unidade_id = uv.id
    LEFT JOIN vistoriadores vist ON v.vistoriador_id = vist.id
    LEFT JOIN profiles pvist ON vist.usuario_id = pvist.id
    WHERE 1=1
  `;
  
  if (filtros.status) {
    query = sql`${query} AND v.status = ${filtros.status}`;
  }
  
  query = sql`${query} ORDER BY v.data_vistoria DESC, v.horario_vistoria DESC`;
  
  const res = await d.execute(query);
  return (res as any).rows || res;
}

export async function getVeiculosAguardandoVistoria() {
  const d = requireDb();
  const res = await d.execute(sql`
    SELECT v.*, p.nome as vendedor_nome, p.cidade as vendedor_cidade, p.uf as vendedor_uf
    FROM veiculos v
    JOIN profiles p ON v.vendedor_id = p.id
    WHERE v.status_analise = 'PRONTO_PARA_VISTORIA'
      AND NOT EXISTS (
        SELECT 1 FROM vistorias vis 
        WHERE vis.veiculo_id = v.id 
          AND vis.status NOT IN ('CANCELADA')
      )
    ORDER BY v.atualizado_em DESC
  `);
  return (res as any).rows || res;
}

export async function criarAgendamento(data: any) {
  const d = requireDb();
  await ensureVistoriaSchema();

  const vistoriadorId = normalizarUuid(data.vistoriador_id);
  const veiculoId = normalizarUuid(data.veiculo_id);
  const vendedorId = normalizarUuid(data.vendedor_id);
  const usuarioId = normalizarUuid(data.usuario_id);

  if (!veiculoId) throw new Error("Veículo inválido para criar o agendamento.");
  if (!vendedorId) throw new Error("Vendedor inválido para criar o agendamento.");
  if (!usuarioId) throw new Error("Usuário inválido para criar o agendamento.");

  const unidade = await encontrarUnidadeRobusta({
    unidadeId: data.unidade_id,
    nomeUnidade: data.unidade_nome || null,
    cidadeUnidade: data.unidade_cidade || null,
    campos: `
      id::text as id,
      ativo,
      duracao_padrao_minutos,
      intervalo_entre_vistorias_minutos
    `,
  });
  if (!unidade) {
    const snippet = String(data.unidade_id || "").slice(0, 10);
    throw new Error(
      `Unidade de vistoria não encontrada (${snippet || "sem id"}). Selecione a unidade novamente na lista.`
    );
  }
  if (!unidade.ativo) {
    throw new Error("A unidade selecionada está inativa. Escolha outra unidade para agendar.");
  }
  const unidadeIdTxt = normalizarUuid(unidade.id);
  if (!unidadeIdTxt) throw new Error("O id da unidade encontrada não é um UUID válido.");

  if (dataEstaNoPassado(data.data_vistoria)) {
    throw new Error("Não é possível agendar em datas passadas. Escolha uma data futura.");
  }
  if (ehHojeSP(data.data_vistoria)) {
    const mins = toMinutes(data.horario_vistoria);
    if (mins <= minutosAgoraSP()) {
      throw new Error("O horário selecionado já passou. Escolha outro horário ou data futura.");
    }
  }

  const slots = await listarSlotsDisponiveisUnidade(unidadeIdTxt, data.data_vistoria, vistoriadorId || null);
  const slotDisponivel = slots.slots.some((slot) => slot.value === data.horario_vistoria);
  if (!slotDisponivel) {
    throw new Error("Esse slot não está mais disponível para agendamento. Recarregue e escolha outro horário.");
  }

  let vistoriadorAlocado: string | null = vistoriadorId || null;
  if (!vistoriadorAlocado) {
    const duracaoPadrao = Number(unidade.duracao_padrao_minutos || 60);
    const janela = Number(unidade.intervalo_entre_vistorias_minutos || 30);
    const slotInicioMin = toMinutes(data.horario_vistoria);
    const slotFimMin = slotInicioMin + duracaoPadrao;
    const slotInicioComJanela = slotInicioMin + janela;
    const vistoriadoresAtivos = await d.execute(sql`
      SELECT v.id::text as id
      FROM vistoriadores v
      WHERE v.unidade_id::text = ${unidadeIdTxt} AND v.status = 'ATIVO'
    `);
    const idsRaw = (vistoriadoresAtivos as any).rows || [];
    const ids: string[] = [];
    for (const v of idsRaw) {
      const vid = normalizarUuid(v?.id);
      if (vid) ids.push(vid);
    }
    for (const vid of ids) {
      const conflitosRes = await d.execute(sql`
        SELECT 1 as existe
        FROM vistorias
        WHERE vistoriador_id::text = ${vid}
          AND data_vistoria = ${data.data_vistoria}
          AND status NOT IN ('CANCELADA', 'REPROVADA', 'CONCLUIDA_COM_RESTRICOES', 'CONCLUIDA', 'REJEITADA')
          AND (
            (
              (EXTRACT(EPOCH FROM horario_vistoria)::int / 60) + (${duracaoPadrao} - ${janela}) > ${slotInicioComJanela}
              AND (EXTRACT(EPOCH FROM horario_vistoria)::int / 60) < ${slotFimMin}
            )
          )
        LIMIT 1
      `);
      const linhas = (conflitosRes as any)?.rows ?? (Array.isArray(conflitosRes) ? conflitosRes : []);
      if (!linhas?.length) {
        vistoriadorAlocado = vid;
        break;
      }
    }
  }

  const vistoriadorUuidSql = vistoriadorAlocado
    ? sql`${vistoriadorAlocado}::uuid`
    : sql`NULL`;

  const res = await d.execute(sql`
    INSERT INTO vistorias (
      veiculo_id, vendedor_id, unidade_id, vistoriador_id,
      data_vistoria, horario_vistoria, status, criado_por
    ) VALUES (
      ${veiculoId}::uuid, ${vendedorId}::uuid,
      ${unidadeIdTxt}::uuid, ${vistoriadorUuidSql},
      ${data.data_vistoria}, ${data.horario_vistoria},
      'AGUARDANDO_CONFIRMACAO', ${usuarioId}::uuid
    ) RETURNING id
  `);

  const linhasRes = (res as any)?.rows ?? (Array.isArray(res) ? res : []);
  if (!linhasRes || linhasRes.length === 0) {
    throw new Error("O banco não retornou o id da vistoria criada. Tente novamente.");
  }
  const primeiraLinha = linhasRes[0];
  if (!primeiraLinha) {
    throw new Error("O banco retornou um registro de vistoria inválido. Tente novamente.");
  }
  const vistoriaIdRaw = primeiraLinha.id;
  if (!vistoriaIdRaw) {
    throw new Error("O banco não retornou o id da vistoria criada. Tente novamente.");
  }
  const vistoriaId = normalizarUuid(vistoriaIdRaw) || String(vistoriaIdRaw);

  try {
    await d.execute(sql`
      UPDATE veiculos
      SET status = 'VISTORIA_AGENDADA', atualizado_em = now()
      WHERE id = ${veiculoId}::uuid
    `);
  } catch (e) { /* ignore: já temos a vistoria criada */ }

  const detalhe = `Vistoria agendada para ${data.data_vistoria} às ${data.horario_vistoria}` +
    (vistoriadorAlocado ? ` (vistoriador alocado automaticamente)` : " (aguardando alocação de vistoriador)");
  try {
    await d.execute(sql`
      INSERT INTO vistorias_historico (vistoria_id, acao, detalhe, usuario_id)
      VALUES (${vistoriaId}::uuid, 'Agendamento criado', ${detalhe}, ${usuarioId}::uuid)
    `);
  } catch (e) { /* ignore: a vistoria já existe */ }

  return { ok: true, id: vistoriaId };
}

export async function listarUnidadesDisponiveis(cidade?: string) {
  const d = requireDb();
  await ensureVistoriaSchema();

  const cidadeRefinada = (cidade || "").trim();
  const priorizaCidade = !!cidadeRefinada;

  const baseFields = sql`
    id::text as id,
    nome,
    cnpj,
    cep,
    endereco,
    cidade,
    estado,
    latitude,
    longitude,
    telefone,
    whatsapp,
    email,
    responsavel,
    horario_atendimento,
    duracao_padrao_minutos,
    intervalo_entre_vistorias_minutos,
    raio_atendimento_km,
    cidades_atendidas,
    ativo,
    criado_em,
    atualizado_em
  `;

  let finalQuery;
  if (priorizaCidade) {
    finalQuery = sql`
      WITH base AS (
        SELECT ${baseFields},
          CASE
            WHEN lower(cidade) = lower(${cidadeRefinada}) THEN 0
            WHEN ${cidadeRefinada} = ANY(cidades_atendidas) THEN 1
            ELSE 2
          END as ordem_prioridade
        FROM unidades_vistoria
        WHERE ativo = true
      )
      SELECT * FROM base ORDER BY ordem_prioridade ASC, lower(nome) ASC
    `;
  } else {
    finalQuery = sql`
      SELECT ${baseFields}
      FROM unidades_vistoria
      WHERE ativo = true
      ORDER BY lower(nome) ASC
    `;
  }

  const res = await d.execute(finalQuery);
  return (res as any).rows || res;
}

export async function listarVistoriadoresUnidade(unidadeId: string) {
  const d = requireDb();
  await ensureVistoriaSchema();
  const unidadeIdNormalizado = normalizarUuid(unidadeId);

  if (!unidadeIdNormalizado) {
    return [];
  }
  
  const res = await d.execute(sql`
    SELECT
      v.id::text as id,
      v.usuario_id::text as usuario_id,
      v.unidade_id::text as unidade_id,
      v.dias_trabalho,
      v.horarios_disponiveis,
      v.status,
      v.criado_em,
      v.atualizado_em,
      p.nome,
      p.email,
      p.whatsapp
    FROM vistoriadores v
    JOIN profiles p ON v.usuario_id = p.id
    WHERE v.unidade_id = ${unidadeIdNormalizado}::uuid AND v.status = 'ATIVO'
  `);
  return (res as any).rows || res;
}

export async function listarUnidadesVistoriaCadastro() {
  const d = requireDb();
  await ensureVistoriaSchema();

  const res = await d.execute(sql`
    SELECT
      uv.id::text as id,
      uv.nome,
      uv.cnpj,
      uv.cep,
      uv.endereco,
      uv.cidade,
      uv.estado,
      uv.latitude,
      uv.longitude,
      uv.telefone,
      uv.whatsapp,
      uv.email,
      uv.responsavel,
      uv.horario_atendimento,
      uv.duracao_padrao_minutos,
      uv.intervalo_entre_vistorias_minutos,
      uv.raio_atendimento_km,
      uv.cidades_atendidas,
      uv.ativo,
      uv.criado_em,
      uv.atualizado_em,
      COUNT(v.id)::int as total_vistoriadores
    FROM unidades_vistoria uv
    LEFT JOIN vistoriadores v ON v.unidade_id = uv.id AND v.status = 'ATIVO'
    GROUP BY uv.id
    ORDER BY uv.ativo DESC, uv.nome ASC
  `);

  return (res as any).rows || res;
}

export async function salvarUnidadeVistoria(data: {
  id?: string;
  nome: string;
  cnpj?: string | null;
  cep?: string | null;
  endereco: string;
  cidade: string;
  estado: string;
  latitude?: number | null;
  longitude?: number | null;
  horario_atendimento?: Record<string, HorarioPeriodo[]> | null;
  duracao_padrao_minutos?: number | null;
  intervalo_entre_vistorias_minutos?: number | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  responsavel?: string | null;
  ativo?: boolean;
}) {
  const d = requireDb();
  await ensureVistoriaSchema();

  if (data.id) {
    const res = await d.execute(sql`
      UPDATE unidades_vistoria
      SET
        nome = ${data.nome},
        cnpj = ${data.cnpj || null},
        cep = ${data.cep || null},
        endereco = ${data.endereco},
        cidade = ${data.cidade},
        estado = ${data.estado},
        latitude = ${data.latitude ?? null},
        longitude = ${data.longitude ?? null},
        horario_atendimento = ${JSON.stringify(data.horario_atendimento || {})}::jsonb,
        duracao_padrao_minutos = ${data.duracao_padrao_minutos ?? 60},
        intervalo_entre_vistorias_minutos = ${data.intervalo_entre_vistorias_minutos ?? 30},
        telefone = ${data.telefone || null},
        whatsapp = ${data.whatsapp || null},
        email = ${data.email || null},
        responsavel = ${data.responsavel || null},
        ativo = ${data.ativo ?? true},
        atualizado_em = now()
      WHERE id = ${data.id}::uuid
      RETURNING id
    `);

    return (res as any).rows?.[0] || null;
  }

  const res = await d.execute(sql`
    INSERT INTO unidades_vistoria (
      nome, cnpj, cep, endereco, cidade, estado, latitude, longitude,
      horario_atendimento, duracao_padrao_minutos, intervalo_entre_vistorias_minutos,
      telefone, whatsapp, email, responsavel, ativo
    ) VALUES (
      ${data.nome},
      ${data.cnpj || null},
      ${data.cep || null},
      ${data.endereco},
      ${data.cidade},
      ${data.estado},
      ${data.latitude ?? null},
      ${data.longitude ?? null},
      ${JSON.stringify(data.horario_atendimento || {})}::jsonb,
      ${data.duracao_padrao_minutos ?? 60},
      ${data.intervalo_entre_vistorias_minutos ?? 30},
      ${data.telefone || null},
      ${data.whatsapp || null},
      ${data.email || null},
      ${data.responsavel || null},
      ${data.ativo ?? true}
    )
    RETURNING id
  `);

  return (res as any).rows?.[0] || null;
}

export async function listarSlotsDisponiveisUnidade(
  unidadeId: string,
  data: string,
  vistoriadorId?: string | null,
  contexto?: { nomeUnidade?: string | null; cidadeUnidade?: string | null }
) {
  const d = requireDb();
  await ensureVistoriaSchema();

  const rawId = String(unidadeId ?? "").trim();
  const uuidMatch = rawId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  const unidadeIdLower = (uuidMatch?.[0] ?? rawId).toLowerCase();
  const nomeUnidadeFiltro = String(contexto?.nomeUnidade ?? "").trim();
  const cidadeUnidadeFiltro = String(contexto?.cidadeUnidade ?? "").trim();
  const vistoriadorIdNormalizado = normalizarUuid(vistoriadorId);

  if (!rawId && !nomeUnidadeFiltro) {
    return { ok: false as const, message: "Selecione uma unidade de vistoria válida.", slots: [] as any[] };
  }

  let unidade: any = null;

  const buscaCriterios: string[] = [];
  if (unidadeIdLower) buscaCriterios.push(`id=«${unidadeIdLower.slice(0, 8)}…${unidadeIdLower.slice(-4)}»`);
  if (nomeUnidadeFiltro) buscaCriterios.push(`nome=«${nomeUnidadeFiltro}»`);
  if (cidadeUnidadeFiltro) buscaCriterios.push(`cidade=«${cidadeUnidadeFiltro}»`);

  try {
    // ESTRATÉGIA 1 — Query SQL com ILIKE (case insensitive) e múltiplas formas de match.
    // Montamos fragmentos de SQL sem aninhar interpoladores de template quebrados no Drizzle.
    // Para evitar conflito, faremos 2 buscas separadas e unimos: uma por UUID, outra por nome.
    const todasCandidatas: any[] = [];

    if (unidadeIdLower) {
      const porUuid = await d.execute(sql`
        SELECT
          id::text as id,
          horario_atendimento,
          duracao_padrao_minutos,
          intervalo_entre_vistorias_minutos,
          ativo,
          nome,
          cidade,
          0 as prioridade_busca
        FROM unidades_vistoria
        WHERE id::text ILIKE ${unidadeIdLower}
           OR id::text ILIKE (${unidadeIdLower} || '%')
        LIMIT 3
      `);
      for (const u of ((porUuid as any).rows || [])) todasCandidatas.push(u);

      if (todasCandidatas.length === 0 && unidadeIdLower.replace(/-/g, "").length >= 32) {
        try {
          const porCast = await d.execute(sql`
            SELECT
              id::text as id,
              horario_atendimento,
              duracao_padrao_minutos,
              intervalo_entre_vistorias_minutos,
              ativo,
              nome,
              cidade,
              0 as prioridade_busca
            FROM unidades_vistoria
            WHERE id = (${unidadeIdLower}::uuid)
            LIMIT 3
          `);
          for (const u of ((porCast as any).rows || [])) {
            if (!todasCandidatas.some((x) => String(x.id).toLowerCase() === String(u.id).toLowerCase())) {
              todasCandidatas.push(u);
            }
          }
        } catch { /* UUID inválido no cast: ignora */ }
      }
    }

    if (nomeUnidadeFiltro) {
      const porNome = await d.execute(sql`
        SELECT
          id::text as id,
          horario_atendimento,
          duracao_padrao_minutos,
          intervalo_entre_vistorias_minutos,
          ativo,
          nome,
          cidade,
          1 as prioridade_busca
        FROM unidades_vistoria
        WHERE (
          lower(nome) ILIKE lower(('%' || ${nomeUnidadeFiltro} || '%'))
          OR lower(nome) = lower(${nomeUnidadeFiltro})
        )
        ${
          cidadeUnidadeFiltro
            ? sql`AND (lower(cidade) ILIKE lower(('%' || ${cidadeUnidadeFiltro} || '%')) OR lower(cidade) = lower(${cidadeUnidadeFiltro}))`
            : sql``
        }
        ORDER BY ativo DESC, length(nome) ASC
        LIMIT 5
      `);
      for (const u of ((porNome as any).rows || [])) {
        if (!todasCandidatas.some((x) => String(x.id).toLowerCase() === String(u.id).toLowerCase())) {
          todasCandidatas.push(u);
        }
      }
    }

    // ESTRATÉGIA 2 — Fallback definitivo: carrega TODAS as unidades ativas e faz
    // match no JavaScript. Garante que qualquer inconsistência de tipo/texto
    // no UUID do Postgres não impede de encontrar a unidade.
    if (todasCandidatas.length === 0) {
      const todas = await listarUnidadesDisponiveis();
      const lista: any[] = Array.isArray(todas) ? (todas as any[]) : (((todas as any)?.rows) as any[]) || [];
      for (const u of lista) {
        const idStr = String((u as any).id || "").toLowerCase();
        const nomeStr = String((u as any).nome || "").toLowerCase();
        const cidStr = String((u as any).cidade || "").toLowerCase();
        const bateId = unidadeIdLower && (
          idStr === unidadeIdLower ||
          idStr.replace(/-/g, "") === unidadeIdLower.replace(/-/g, "") ||
          idStr.startsWith(unidadeIdLower)
        );
        const bateNome = nomeUnidadeFiltro && (
          nomeStr === nomeUnidadeFiltro.toLowerCase() ||
          (cidadeUnidadeFiltro && nomeStr.includes(nomeUnidadeFiltro.toLowerCase()) &&
            cidStr.includes(cidadeUnidadeFiltro.toLowerCase())) ||
          (!cidadeUnidadeFiltro && nomeStr.includes(nomeUnidadeFiltro.toLowerCase()))
        );
        if (bateId || bateNome) {
          todasCandidatas.push({ ...u, prioridade_busca: bateId ? 0 : 1 });
          if (todasCandidatas.length >= 3) break;
        }
      }
    }

    if (todasCandidatas.length === 0) {
      return {
        ok: false as const,
        message: `Unidade de vistoria não encontrada. Critérios usados: ${buscaCriterios.join(" • ") || "(nenhum)"}. Tente reabrir o modal e selecionar a unidade novamente.`,
        slots: [] as any[],
      };
    }

    unidade = todasCandidatas.sort((a, b) => Number(a.prioridade_busca ?? 9) - Number(b.prioridade_busca ?? 9))[0];
  } catch (err: any) {
    return {
      ok: false as const,
      message: `Erro ao buscar unidade: ${err.message} (critérios: ${buscaCriterios.join(" • ") || "(nenhum)"})`,
      slots: [] as any[],
    };
  }

  if (!unidade) {
    return {
      ok: false as const,
      message: `Unidade de vistoria não carregou (critérios: ${buscaCriterios.join(" • ") || "(nenhum)"}).`,
      slots: [] as any[],
    };
  }
  if (!unidade.ativo) {
    return {
      ok: false as const,
      message: "Esta unidade está inativa no cadastro. Edite para mudar o status para ATIVA.",
      slots: [] as any[]
    };
  }

  const horarioAtendimento = normalizarHorarioAtendimento(unidade.horario_atendimento);
  if (dataEstaNoPassado(data)) {
    return {
      ok: false as const,
      message: "Não é possível agendar em datas passadas. Escolha uma data futura.",
      slots: [] as any[],
    };
  }
  const dataBase = new Date(`${data}T12:00:00`);
  if (Number.isNaN(dataBase.getTime())) {
    return { ok: false as const, message: "Data inválida para geração dos slots.", slots: [] as any[] };
  }

  const diaSemana = String(dataBase.getDay());
  const periodosDia = horarioAtendimento[diaSemana] || [];
  if (periodosDia.length === 0) {
    return { ok: true as const, message: "A unidade não atende nesse dia.", slots: [] as any[], configuracao: unidade };
  }

  const duracao = Math.max(Number(unidade.duracao_padrao_minutos || 60), 1);
  const intervalo = Math.max(Number(unidade.intervalo_entre_vistorias_minutos || 0), 0);
  const passo = Math.max(duracao + intervalo, 1);

  const unidadeIdTxt = String(unidade.id || "").toLowerCase();
  const unidadeIdEncontrado = (unidadeIdTxt.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/) || [])[0] || unidadeIdTxt;

  const agendamentosRes = await d.execute(sql`
    SELECT horario_vistoria, vistoriador_id
    FROM vistorias
    WHERE unidade_id::text = ${unidadeIdEncontrado}
      AND data_vistoria = ${data}
      AND status NOT IN ('CANCELADA')
  `);
  const agendamentos = (agendamentosRes as any).rows || [];

  let agendamentosVistoriador: any[] = [];
  if (vistoriadorIdNormalizado) {
    const agendamentosVistoriadorRes = await d.execute(sql`
      SELECT horario_vistoria
      FROM vistorias
      WHERE vistoriador_id::text = ${vistoriadorIdNormalizado}
        AND data_vistoria = ${data}
        AND status NOT IN ('CANCELADA')
    `);
    agendamentosVistoriador = (agendamentosVistoriadorRes as any).rows || [];
  }

  const agoraMinutosSP = ehHojeSP(data) ? minutosAgoraSP() : -1;
  const slots = [] as Array<{ value: string; fim: string; label: string }>;
  for (const periodo of periodosDia) {
    if (!periodo || typeof periodo !== "object") continue;
    const inicioDia = toMinutes(periodo.inicio);
    const fimDia = toMinutes(periodo.fim);
    if (fimDia <= inicioDia || fimDia - inicioDia < duracao) continue;

    for (let inicio = inicioDia; inicio + duracao <= fimDia; inicio += passo) {
      if (agoraMinutosSP >= 0 && inicio <= agoraMinutosSP) continue;
      const fim = inicio + duracao;
      const conflitoUnidade = agendamentos.some((agendamento: any) => {
        const inicioAgendado = toMinutes(String(agendamento?.horario_vistoria || "").slice(0, 5));
        const fimAgendado = inicioAgendado + duracao;
        return inicio < fimAgendado && fim > inicioAgendado;
      });
      const conflitoVistoriador = agendamentosVistoriador.some((agendamento: any) => {
        const inicioAgendado = toMinutes(String(agendamento?.horario_vistoria || "").slice(0, 5));
        const fimAgendado = inicioAgendado + duracao;
        return inicio < fimAgendado && fim > inicioAgendado;
      });
      if (conflitoUnidade || conflitoVistoriador) continue;

      const inicioLabel = minutesToTime(inicio);
      const fimLabel = minutesToTime(fim);
      slots.push({
        value: inicioLabel,
        fim: fimLabel,
        label: `${inicioLabel} - ${fimLabel}`,
      });
    }
  }

  if (slots.length === 0) {
    return {
      ok: true as const,
      message: "Os períodos configurados desse dia não geraram slots livres.",
      slots,
      configuracao: {
        duracao_padrao_minutos: duracao,
        intervalo_entre_vistorias_minutos: intervalo,
        periodos: periodosDia,
      },
    };
  }

  return {
    ok: true as const,
    slots,
    configuracao: {
      duracao_padrao_minutos: duracao,
      intervalo_entre_vistorias_minutos: intervalo,
      periodos: periodosDia,
    },
  };
}

export async function listarVistoriadoresCadastro() {
  const d = requireDb();
  await ensureVistoriaSchema();

  const res = await d.execute(sql`
    SELECT
      p.id::text as usuario_id,
      p.nome,
      p.email,
      p.whatsapp,
      p.ativo as usuario_ativo,
      v.id::text as id,
      v.unidade_id::text as unidade_id,
      v.status,
      uv.nome as unidade_nome
    FROM profiles p
    LEFT JOIN vistoriadores v ON v.usuario_id = p.id
    LEFT JOIN unidades_vistoria uv ON uv.id = v.unidade_id
    WHERE p.role = 'vistoriador'::app_role
    ORDER BY p.nome ASC
  `);

  return (res as any).rows || res;
}

export async function salvarVistoriadorCadastro(data: {
  usuario_id: string;
  unidade_id: string;
  status?: string;
}) {
  const d = requireDb();
  await ensureVistoriaSchema();

  const res = await d.execute(sql`
    INSERT INTO vistoriadores (usuario_id, unidade_id, status)
    VALUES (
      ${data.usuario_id}::uuid,
      ${data.unidade_id}::uuid,
      ${data.status || "ATIVO"}
    )
    ON CONFLICT (usuario_id) DO UPDATE SET
      unidade_id = EXCLUDED.unidade_id,
      status = EXCLUDED.status,
      atualizado_em = now()
    RETURNING id
  `);

  return (res as any).rows?.[0] || null;
}

export async function getVistoriaVendedor(vendedorId: string) {
  const d = requireDb();
  await ensureVistoriaSchema();
  
  const res = await d.execute(sql`
    SELECT v.*, 
           vei.placa, vei.marca, vei.modelo,
           uv.nome as unidade_nome, uv.endereco as unidade_endereco, uv.cidade as unidade_cidade, uv.estado as unidade_estado,
           uv.whatsapp as unidade_whatsapp
    FROM vistorias v
    JOIN veiculos vei ON v.veiculo_id = vei.id
    JOIN unidades_vistoria uv ON v.unidade_id = uv.id
    WHERE v.vendedor_id = ${vendedorId}::uuid
      AND v.status NOT IN ('CANCELADA', 'CONCLUIDA')
    ORDER BY v.criado_em DESC
    LIMIT 1
  `);
  
  return (res as any).rows[0] || null;
}

export async function confirmarVistoriaVendedor(vistoriaId: string, vendedorId: string) {
  const d = requireDb();
  
  await d.execute(sql`
    UPDATE vistorias 
    SET status = 'CONFIRMADA', confirmada_em = now(), atualizado_em = now()
    WHERE id = ${vistoriaId}::uuid AND vendedor_id = ${vendedorId}::uuid
  `);
  
  await d.execute(sql`
    INSERT INTO vistorias_historico (vistoria_id, acao, detalhe, usuario_id)
    VALUES (${vistoriaId}, 'Presença confirmada', 'Vendedor confirmou presença no agendamento.', ${vendedorId}::uuid)
  `);
  
  return { ok: true };
}

// App Vistoriador

export async function listarVistoriasHojeVistoriador(usuarioId: string) {
  const d = requireDb();
  await ensureVistoriaSchema();
  
  const res = await d.execute(sql`
    SELECT v.*, 
           vei.placa, vei.marca, vei.modelo, vei.ano,
           prof.nome as vendedor_nome,
           uv.nome as unidade_nome
    FROM vistorias v
    JOIN veiculos vei ON v.veiculo_id = vei.id
    JOIN profiles prof ON v.vendedor_id = prof.id
    JOIN unidades_vistoria uv ON v.unidade_id = uv.id
    JOIN vistoriadores vist ON v.vistoriador_id = vist.id
    WHERE vist.usuario_id = ${usuarioId}::uuid
      AND v.data_vistoria = CURRENT_DATE
      AND v.status NOT IN ('CANCELADA')
    ORDER BY v.horario_vistoria ASC
  `);
  
  return (res as any).rows || res;
}

export async function getVistoriaDetalheVistoriador(vistoriaId: string, usuarioId: string) {
  const d = requireDb();
  
  const res = await d.execute(sql`
    SELECT v.*, 
           vei.placa, vei.marca, vei.modelo, vei.ano, vei.km as km_base,
           prof.nome as vendedor_nome, prof.telefone as vendedor_telefone,
           uv.nome as unidade_nome, uv.endereco as unidade_endereco,
           l.id as laudo_id, l.status as laudo_status
    FROM vistorias v
    JOIN veiculos vei ON v.veiculo_id = vei.id
    JOIN profiles prof ON v.vendedor_id = prof.id
    JOIN unidades_vistoria uv ON v.unidade_id = uv.id
    JOIN vistoriadores vist ON v.vistoriador_id = vist.id
    LEFT JOIN laudos l ON l.vistoria_id = v.id
    WHERE v.id = ${vistoriaId}::uuid
      AND vist.usuario_id = ${usuarioId}::uuid
    LIMIT 1
  `);
  
  return (res as any).rows[0] || null;
}

export async function iniciarCheckin(data: { vistoriaId: string; usuarioId: string; placa: string; localizacao: any }) {
  const d = requireDb();
  await ensureVistoriaSchema();

  const vistRes = await d.execute(sql`SELECT id FROM vistoriadores WHERE usuario_id = ${data.usuarioId}::uuid LIMIT 1`);
  const vistoriador = (vistRes as any).rows[0];
  if (!vistoriador) throw new Error("Vistoriador não encontrado.");

  const vRes = await d.execute(sql`
    SELECT v.id, v.veiculo_id, vei.placa 
    FROM vistorias v 
    JOIN veiculos vei ON v.veiculo_id = vei.id
    WHERE v.id = ${data.vistoriaId}::uuid 
  `);
  const vistoria = (vRes as any).rows[0];
  if (!vistoria) throw new Error("Vistoria não encontrada.");
  if (vistoria.placa.toUpperCase() !== data.placa.toUpperCase()) throw new Error("Essa placa não corresponde ao veículo agendado.");

  const res = await d.execute(sql`
    INSERT INTO laudos (vistoria_id, veiculo_id, vistoriador_id, placa_confirmada, localizacao_checkin, status)
    VALUES (${data.vistoriaId}::uuid, ${vistoria.veiculo_id}::uuid, ${vistoriador.id}::uuid, ${data.placa}, ${JSON.stringify(data.localizacao)}, 'EM_ANDAMENTO')
    ON CONFLICT (vistoria_id) DO UPDATE SET atualizado_em = now()
    RETURNING id
  `);

  const laudoId = (res as any).rows[0].id;

  await d.execute(sql`UPDATE vistorias SET status = 'EM_ANDAMENTO', atualizado_em = now() WHERE id = ${data.vistoriaId}::uuid`);

  return { ok: true, laudoId };
}

export async function salvarItemChecklist(data: { laudoId: string; etapa: string; item_chave: string; status: string; observacao?: string | null; foto_url?: string | null }) {
  const d = requireDb();
  await ensureVistoriaSchema();

  await d.execute(sql`
    INSERT INTO laudo_checklist (laudo_id, etapa, item_chave, status, observacao, foto_url, atualizado_em)
    VALUES (${data.laudoId}::uuid, ${data.etapa}, ${data.item_chave}, ${data.status}, ${data.observacao}, ${data.foto_url}, now())
    ON CONFLICT (laudo_id, item_chave) DO UPDATE SET 
      status = EXCLUDED.status, 
      observacao = EXCLUDED.observacao, 
      foto_url = EXCLUDED.foto_url,
      atualizado_em = now()
  `);

  return { ok: true };
}

export async function salvarFotoLaudo(data: { laudoId: string; tipo_foto: string; url: string; metadata?: any }) {
  const d = requireDb();
  await ensureVistoriaSchema();

  await d.execute(sql`
    INSERT INTO laudo_fotos (laudo_id, tipo_foto, url, metadata)
    VALUES (${data.laudoId}::uuid, ${data.tipo_foto}, ${data.url}, ${JSON.stringify(data.metadata)})
  `);

  return { ok: true };
}

export async function concluirVistoriaApp(data: { laudoId: string; quilometragem: number; observacao_geral: string; declaracao: boolean }) {
  const d = requireDb();
  
  const lRes = await d.execute(sql`SELECT vistoria_id, veiculo_id FROM laudos WHERE id = ${data.laudoId}::uuid`);
  const laudo = (lRes as any).rows[0];
  if (!laudo) throw new Error("Laudo não encontrado.");

  await d.execute(sql`
    UPDATE laudos SET 
      status = 'CONCLUIDO', 
      quilometragem_atual = ${data.quilometragem},
      observacao_geral = ${data.observacao_geral},
      declaracao_vistoriador = ${data.declaracao},
      concluido_em = now(),
      atualizado_em = now()
    WHERE id = ${data.laudoId}::uuid
  `);

  await d.execute(sql`UPDATE vistorias SET status = 'CONCLUIDA', atualizado_em = now() WHERE id = ${laudo.vistoria_id}::uuid`);
  
  await d.execute(sql`
    UPDATE veiculos SET 
      status = 'VISTORIA_CONCLUIDA', 
      status_analise = 'AGUARDANDO_ANALISE_LAUDO',
      km = ${data.quilometragem},
      atualizado_em = now() 
    WHERE id = ${laudo.veiculo_id}::uuid
  `);

  return { ok: true };
}
