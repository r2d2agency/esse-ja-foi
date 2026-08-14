import { sql } from "drizzle-orm";
import { db } from "./index";

export type Row = Record<string, any>;

function requireDb() {
  if (!db) throw new Error("Banco de dados indisponível.");
  return db;
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
      telefone text,
      whatsapp text,
      email text,
      responsavel text,
      horario_atendimento jsonb, -- { seg_sex: "08:00-18:00", sab: "08:00-12:00" }
      duracao_padrao_minutos integer DEFAULT 60,
      raio_atendimento_km integer,
      cidades_atendidas text[],
      ativo boolean DEFAULT true,
      criado_em timestamptz DEFAULT now(),
      atualizado_em timestamptz DEFAULT now()
    );
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
}

// Server Functions para Admin Vistoria

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
  
  const res = await d.execute(sql`
    INSERT INTO vistorias (
      veiculo_id, vendedor_id, unidade_id, vistoriador_id, 
      data_vistoria, horario_vistoria, status, criado_por
    ) VALUES (
      ${data.veiculo_id}::uuid, ${data.vendedor_id}::uuid, 
      ${data.unidade_id}::uuid, ${data.vistoriador_id}::uuid,
      ${data.data_vistoria}, ${data.horario_vistoria},
      'AGUARDANDO_CONFIRMACAO', ${data.usuario_id}::uuid
    ) RETURNING id
  `);
  
  const vistoriaId = (res as any).rows[0].id;
  
  // Atualiza status do veículo
  await d.execute(sql`
    UPDATE veiculos 
    SET status = 'VISTORIA_AGENDADA', atualizado_em = now() 
    WHERE id = ${data.veiculo_id}::uuid
  `);
  
  // Log histórico
  await d.execute(sql`
    INSERT INTO vistorias_historico (vistoria_id, acao, detalhe, usuario_id)
    VALUES (${vistoriaId}, 'Agendamento criado', 'Vistoria agendada para ' || ${data.data_vistoria} || ' às ' || ${data.horario_vistoria}, ${data.usuario_id}::uuid)
  `);
  
  return { ok: true, id: vistoriaId };
}

export async function listarUnidadesDisponiveis(cidade?: string) {
  const d = requireDb();
  await ensureVistoriaSchema();
  
  let query = sql`SELECT * FROM unidades_vistoria WHERE ativo = true`;
  if (cidade) {
    query = sql`${query} AND (cidade = ${cidade} OR ${cidade} = ANY(cidades_atendidas))`;
  }
  
  const res = await d.execute(query);
  return (res as any).rows || res;
}

export async function listarVistoriadoresUnidade(unidadeId: string) {
  const d = requireDb();
  await ensureVistoriaSchema();
  
  const res = await d.execute(sql`
    SELECT v.*, p.nome, p.email, p.whatsapp
    FROM vistoriadores v
    JOIN profiles p ON v.usuario_id = p.id
    WHERE v.unidade_id = ${unidadeId}::uuid AND v.status = 'ATIVO'
  `);
  return (res as any).rows || res;
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
