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
  
  await d.execute(sql`
    UPDATE veiculos 
    SET status = 'VISTORIA_AGENDADA', atualizado_em = now() 
    WHERE id = ${data.veiculo_id}::uuid
  `);
  
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

export async function listarUnidadesVistoriaCadastro() {
  const d = requireDb();
  await ensureVistoriaSchema();

  const res = await d.execute(sql`
    SELECT
      uv.*,
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
      nome, cnpj, cep, endereco, cidade, estado,
      telefone, whatsapp, email, responsavel, ativo
    ) VALUES (
      ${data.nome},
      ${data.cnpj || null},
      ${data.cep || null},
      ${data.endereco},
      ${data.cidade},
      ${data.estado},
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

export async function listarVistoriadoresCadastro() {
  const d = requireDb();
  await ensureVistoriaSchema();

  const res = await d.execute(sql`
    SELECT
      p.id as usuario_id,
      p.nome,
      p.email,
      p.whatsapp,
      p.ativo as usuario_ativo,
      v.id,
      v.unidade_id,
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
