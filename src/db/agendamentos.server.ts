import { sql } from "drizzle-orm";
import { db } from "./index";
import { ensureCadastroSchema, RegraNegocioError, type Row } from "./cadastro.server";

function requireDb() {
  if (!db) throw new RegraNegocioError("Banco de dados indisponível. Verifique a DATABASE_URL.", 503);
  return db;
}

let prepared = false;

/** Cria as tabelas de parceiros, agendamentos e notificações. Idempotente. */
export async function ensureAgendaSchema() {
  if (prepared) return;
  await ensureCadastroSchema();
  const d = requireDb();

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS parceiros_vistoria (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      unidade text,
      cidade text,
      uf text,
      endereco text,
      telefone text,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      veiculo_id uuid NOT NULL,
      vistoriador_id uuid NOT NULL,
      parceiro_id uuid,
      unidade text,
      data_hora timestamptz NOT NULL,
      duracao_min integer NOT NULL DEFAULT 60,
      status text NOT NULL DEFAULT 'AGENDADO',
      cidade text,
      observacao text,
      responsavel_interno text,
      motivo text,
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  await d.execute(sql`CREATE INDEX IF NOT EXISTS agendamentos_vistoriador_idx ON agendamentos (vistoriador_id, data_hora);`);
  await d.execute(sql`CREATE INDEX IF NOT EXISTS agendamentos_veiculo_idx ON agendamentos (veiculo_id);`);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      destinatario_id uuid,
      titulo text NOT NULL,
      mensagem text,
      tipo text NOT NULL DEFAULT 'AGENDAMENTO',
      lida boolean NOT NULL DEFAULT false,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  await d.execute(sql`CREATE INDEX IF NOT EXISTS notificacoes_destinatario_idx ON notificacoes (destinatario_id, lida);`);

  prepared = true;
}

const STATUS_ATIVOS = ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO"];

async function notificar(
  exec: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> },
  destinatarioId: string,
  titulo: string,
  mensagem: string,
) {
  await exec.execute(sql`
    INSERT INTO notificacoes (destinatario_id, titulo, mensagem, tipo)
    VALUES (${destinatarioId}, ${titulo}, ${mensagem}, 'AGENDAMENTO');
  `);
}

async function log(
  exec: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> },
  entidadeId: string,
  acao: string,
  detalhe?: string | null,
  de?: string | null,
  para?: string | null,
  usuario?: string | null,
) {
  await exec.execute(sql`
    INSERT INTO logs (entidade, entidade_id, acao, de, para, detalhe, usuario)
    VALUES ('agendamento', ${entidadeId}, ${acao}, ${de ?? null}, ${para ?? null}, ${detalhe ?? null}, ${usuario ?? null});
  `);
}

/** Vistoriadores ativos, para os selects das telas. */
export async function listarVistoriadores() {
  await ensureAgendaSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`
    SELECT id, nome, email FROM profiles
    WHERE lower(role::text) = 'vistoriador' AND coalesce(ativo, true) = true
    ORDER BY nome;
  `)) as unknown as Array<Row>;
  return rows;
}

export async function listarParceiros() {
  await ensureAgendaSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`
    SELECT * FROM parceiros_vistoria WHERE ativo = true ORDER BY nome;
  `)) as unknown as Array<Row>;
  return rows;
}

export async function salvarParceiro(input: {
  id?: string | undefined;
  nome: string;
  unidade?: string | null;
  cidade?: string | null;
  uf?: string | null;
  endereco?: string | null;
  telefone?: string | null;
}) {
  await ensureAgendaSchema();
  const d = requireDb();
  if (!input.nome?.trim()) throw new RegraNegocioError("Informe o nome do parceiro.", 422);
  if (input.id) {
    await d.execute(sql`
      UPDATE parceiros_vistoria SET nome = ${input.nome.trim()}, unidade = ${input.unidade ?? null},
        cidade = ${input.cidade ?? null}, uf = ${input.uf ?? null}, endereco = ${input.endereco ?? null},
        telefone = ${input.telefone ?? null}
      WHERE id = ${input.id};
    `);
    return { id: input.id };
  }
  const rows = (await d.execute(sql`
    INSERT INTO parceiros_vistoria (nome, unidade, cidade, uf, endereco, telefone)
    VALUES (${input.nome.trim()}, ${input.unidade ?? null}, ${input.cidade ?? null}, ${input.uf ?? null},
            ${input.endereco ?? null}, ${input.telefone ?? null})
    RETURNING id;
  `)) as unknown as Array<{ id: string }>;
  return { id: rows[0]?.id as string };
}

/** Horários já ocupados de um vistoriador em um dia (YYYY-MM-DD). */
export async function horariosOcupados(vistoriadorId: string, dia: string) {
  await ensureAgendaSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`
    SELECT id, data_hora, duracao_min FROM agendamentos
    WHERE vistoriador_id = ${vistoriadorId}
      AND status = ANY(${STATUS_ATIVOS})
      AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date = ${dia}::date
    ORDER BY data_hora;
  `)) as unknown as Array<Row>;
  return rows;
}

async function validarConflito(
  exec: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> },
  vistoriadorId: string,
  dataHora: Date,
  duracao: number,
  ignorarId?: string,
) {
  const fim = new Date(dataHora.getTime() + duracao * 60000);
  const conflitos = (await exec.execute(sql`
    SELECT id FROM agendamentos
    WHERE vistoriador_id = ${vistoriadorId}
      AND status = ANY(${STATUS_ATIVOS})
      AND id <> ${ignorarId ?? "00000000-0000-0000-0000-000000000000"}
      AND data_hora < ${fim.toISOString()}::timestamptz
      AND (data_hora + (duracao_min || ' minutes')::interval) > ${dataHora.toISOString()}::timestamptz
    LIMIT 1;
  `)) as unknown as Array<{ id: string }>;
  if (conflitos.length > 0) {
    throw new RegraNegocioError("O vistoriador já possui um agendamento nesse horário.", 409);
  }
}

export type AgendamentoInput = {
  veiculoId: string;
  vistoriadorId: string;
  parceiroId?: string | null;
  unidade?: string | null;
  dataHora: string;
  duracaoMin?: number | null;
  observacao?: string | null;
  responsavelInterno?: string | null;
  usuario?: string | null;
};

export async function criarAgendamento(input: AgendamentoInput) {
  await ensureAgendaSchema();
  const d = requireDb();

  const dataHora = new Date(input.dataHora);
  if (Number.isNaN(dataHora.getTime())) throw new RegraNegocioError("Data e horário inválidos.", 422);
  const duracao = input.duracaoMin && input.duracaoMin > 0 ? input.duracaoMin : 60;

  const veiculos = (await d.execute(sql`
    SELECT id, placa, status, cidade, valor_fipe, valor_interesse_cliente, tipo_expectativa,
           alerta_expectativa, ciente_expectativa
    FROM veiculos WHERE id = ${input.veiculoId} LIMIT 1;
  `)) as unknown as Array<Row>;
  const veiculo = veiculos[0];
  if (!veiculo) throw new RegraNegocioError("Veículo não encontrado.", 404);
  if (String(veiculo['status']).toUpperCase() !== "CADASTRADO") {
    throw new RegraNegocioError(
      `Só é possível agendar veículos com status CADASTRADO (atual: ${veiculo['status']}).`,
      422,
    );
  }
  const temExpectativa =
    veiculo['valor_fipe'] != null && veiculo['valor_interesse_cliente'] != null && !!veiculo['tipo_expectativa'];
  if (!temExpectativa) {
    throw new RegraNegocioError(
      "Preencha valor FIPE, valor de interesse do cliente e tipo de expectativa antes de agendar.",
      422,
    );
  }
  if (veiculo['alerta_expectativa'] === true && veiculo['ciente_expectativa'] !== true) {
    throw new RegraNegocioError(
      "Expectativa acima do praticado. Registre a ciência do cliente antes de agendar a vistoria.",
      422,
    );
  }

  const vistoriadores = (await d.execute(sql`
    SELECT id, nome, role::text AS role, coalesce(ativo, true) AS ativo
    FROM profiles WHERE id = ${input.vistoriadorId} LIMIT 1;
  `)) as unknown as Array<Row>;
  const vistoriador = vistoriadores[0];
  if (!vistoriador) throw new RegraNegocioError("Vistoriador não encontrado.", 404);
  if (String(vistoriador['role']).toLowerCase() !== "vistoriador") {
    throw new RegraNegocioError("O usuário selecionado não possui o perfil de vistoriador.", 422);
  }
  if (vistoriador['ativo'] !== true) throw new RegraNegocioError("Vistoriador inativo.", 422);

  await validarConflito(d, input.vistoriadorId, dataHora, duracao);

  const id = await d.transaction(async (tx) => {
    await validarConflito(tx, input.vistoriadorId, dataHora, duracao);
    const rows = (await tx.execute(sql`
      INSERT INTO agendamentos (veiculo_id, vistoriador_id, parceiro_id, unidade, data_hora, duracao_min,
        cidade, observacao, responsavel_interno, status)
      VALUES (${input.veiculoId}, ${input.vistoriadorId}, ${input.parceiroId || null}, ${input.unidade ?? null},
        ${dataHora.toISOString()}::timestamptz, ${duracao}, ${(veiculo['cidade'] as string) ?? null},
        ${input.observacao ?? null}, ${input.responsavelInterno ?? null}, 'AGENDADO')
      RETURNING id;
    `)) as unknown as Array<{ id: string }>;
    const novoId = rows[0]?.id as string;

    await tx.execute(sql`UPDATE veiculos SET status = 'AGENDADO', atualizado_em = now() WHERE id = ${input.veiculoId};`);
    await tx.execute(sql`
      INSERT INTO logs (entidade, entidade_id, acao, de, para, detalhe, usuario)
      VALUES ('veiculo', ${input.veiculoId}, 'STATUS', 'CADASTRADO', 'AGENDADO', 'Vistoria agendada', ${input.usuario ?? null});
    `);
    await log(tx, novoId, "CRIADO", `Veículo ${veiculo['placa']}`, null, "AGENDADO", input.usuario ?? null);
    await notificar(
      tx,
      input.vistoriadorId,
      "Nova vistoria agendada",
      `Veículo ${veiculo['placa']} em ${dataHora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
    );
    return novoId;
  });

  return { id, status: "AGENDADO" };
}

export async function listarAgendamentos(filtros: {
  vistoriadorId?: string | null;
  parceiroId?: string | null;
  cidade?: string | null;
  status?: string | null;
  de?: string | null;
  ate?: string | null;
} = {}) {
  await ensureAgendaSchema();
  const d = requireDb();
  const vistoriador = filtros.vistoriadorId ?? "";
  const parceiro = filtros.parceiroId ?? "";
  const cidade = (filtros.cidade ?? "").toLowerCase();
  const status = (filtros.status ?? "").toUpperCase();
  const de = filtros.de ?? "";
  const ate = filtros.ate ?? "";
  const rows = (await d.execute(sql`
    SELECT a.*, v.placa, v.marca, v.modelo, v.cidade AS veiculo_cidade,
           p.nome AS vistoriador_nome, pa.nome AS parceiro_nome, c.nome AS cliente_nome
    FROM agendamentos a
    LEFT JOIN veiculos v ON v.id = a.veiculo_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN profiles p ON p.id = a.vistoriador_id
    LEFT JOIN parceiros_vistoria pa ON pa.id = a.parceiro_id
    WHERE (${vistoriador === ""} OR a.vistoriador_id::text = ${vistoriador})
      AND (${parceiro === ""} OR a.parceiro_id::text = ${parceiro})
      AND (${cidade === ""} OR lower(coalesce(a.cidade, v.cidade, '')) LIKE ${`%${cidade}%`})
      AND (${status === ""} OR upper(a.status) = ${status})
      AND (${de === ""} OR a.data_hora >= ${de || "1970-01-01"}::timestamptz)
      AND (${ate === ""} OR a.data_hora < ${ate || "2999-01-01"}::timestamptz)
    ORDER BY a.data_hora
    LIMIT 500;
  `)) as unknown as Array<Row>;
  return rows;
}

/** Agenda da semana (segunda a domingo) a partir de uma data qualquer. */
export async function agendaSemana(referencia: string, filtros: {
  vistoriadorId?: string | null;
  parceiroId?: string | null;
  cidade?: string | null;
} = {}) {
  const base = referencia ? new Date(`${referencia}T12:00:00`) : new Date();
  const dia = (base.getDay() + 6) % 7;
  const inicio = new Date(base);
  inicio.setDate(base.getDate() - dia);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 7);

  const itens = await listarAgendamentos({
    ...filtros,
    de: inicio.toISOString(),
    ate: fim.toISOString(),
  });

  const dias: Array<{ data: string; itens: Array<Row> }> = [];
  for (let i = 0; i < 7; i++) {
    const dt = new Date(inicio);
    dt.setDate(inicio.getDate() + i);
    const key = dt.toISOString().slice(0, 10);
    dias.push({
      data: key,
      itens: itens.filter((a) => new Date(String(a['data_hora'])).toISOString().slice(0, 10) === key),
    });
  }
  return { inicio: inicio.toISOString(), fim: fim.toISOString(), dias };
}

/** Agenda do vistoriador logado, agrupada por dia (app mobile). */
export async function meusAgendamentos(vistoriadorId: string) {
  const itens = await listarAgendamentos({ vistoriadorId });
  const grupos = new Map<string, Array<Row>>();
  for (const item of itens) {
    const key = new Date(String(item['data_hora'])).toISOString().slice(0, 10);
    const lista = grupos.get(key) ?? [];
    lista.push(item);
    grupos.set(key, lista);
  }
  return Array.from(grupos.entries()).map(([data, lista]) => ({ data, itens: lista }));
}

export async function remarcarAgendamento(input: {
  id: string;
  dataHora: string;
  motivo: string;
  vistoriadorId?: string | null;
  usuario?: string | null;
}) {
  await ensureAgendaSchema();
  const d = requireDb();
  const motivo = (input.motivo ?? "").trim();
  if (motivo.length < 5) throw new RegraNegocioError("Informe o motivo da remarcação (mínimo 5 caracteres).", 422);

  const rows = (await d.execute(sql`
    SELECT a.*, v.placa FROM agendamentos a LEFT JOIN veiculos v ON v.id = a.veiculo_id
    WHERE a.id = ${input.id} LIMIT 1;
  `)) as unknown as Array<Row>;
  const atual = rows[0];
  if (!atual) throw new RegraNegocioError("Agendamento não encontrado.", 404);
  if (String(atual['status']).toUpperCase() === "CANCELADO") {
    throw new RegraNegocioError("Agendamento cancelado não pode ser remarcado.", 422);
  }

  const nova = new Date(input.dataHora);
  if (Number.isNaN(nova.getTime())) throw new RegraNegocioError("Data e horário inválidos.", 422);
  const vistoriadorId = input.vistoriadorId || String(atual['vistoriador_id']);
  const duracao = Number(atual['duracao_min'] ?? 60);
  await validarConflito(d, vistoriadorId, nova, duracao, input.id);

  const antes = new Date(String(atual['data_hora'])).toISOString();
  await d.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE agendamentos SET data_hora = ${nova.toISOString()}::timestamptz, vistoriador_id = ${vistoriadorId},
        status = 'AGENDADO', motivo = ${motivo}, atualizado_em = now()
      WHERE id = ${input.id};
    `);
    await log(tx, input.id, "REMARCADO", motivo, antes, nova.toISOString(), input.usuario ?? null);
    await notificar(
      tx,
      vistoriadorId,
      "Vistoria remarcada",
      `Veículo ${atual['placa']} remarcado para ${nova.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Motivo: ${motivo}`,
    );
  });
  return { id: input.id, dataHora: nova.toISOString() };
}

export async function cancelarAgendamento(input: { id: string; motivo: string; usuario?: string | null }) {
  await ensureAgendaSchema();
  const d = requireDb();
  const motivo = (input.motivo ?? "").trim();
  if (motivo.length < 5) throw new RegraNegocioError("Informe o motivo do cancelamento (mínimo 5 caracteres).", 422);

  const rows = (await d.execute(sql`
    SELECT a.*, v.placa, v.status AS veiculo_status FROM agendamentos a
    LEFT JOIN veiculos v ON v.id = a.veiculo_id WHERE a.id = ${input.id} LIMIT 1;
  `)) as unknown as Array<Row>;
  const atual = rows[0];
  if (!atual) throw new RegraNegocioError("Agendamento não encontrado.", 404);
  if (String(atual['status']).toUpperCase() === "CANCELADO") {
    throw new RegraNegocioError("Agendamento já está cancelado.", 422);
  }

  await d.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE agendamentos SET status = 'CANCELADO', motivo = ${motivo}, atualizado_em = now() WHERE id = ${input.id};
    `);
    if (String(atual['veiculo_status']).toUpperCase() === "AGENDADO") {
      await tx.execute(sql`
        UPDATE veiculos SET status = 'CADASTRADO', atualizado_em = now() WHERE id = ${atual['veiculo_id']};
      `);
      await tx.execute(sql`
        INSERT INTO logs (entidade, entidade_id, acao, de, para, detalhe, usuario)
        VALUES ('veiculo', ${atual['veiculo_id']}, 'STATUS', 'AGENDADO', 'CADASTRADO', ${`Agendamento cancelado: ${motivo}`}, ${input.usuario ?? null});
      `);
    }
    await log(tx, input.id, "CANCELADO", motivo, String(atual['status']), "CANCELADO", input.usuario ?? null);
    await notificar(
      tx,
      String(atual['vistoriador_id']),
      "Vistoria cancelada",
      `Veículo ${atual['placa']} teve a vistoria cancelada. Motivo: ${motivo}`,
    );
  });
  return { id: input.id, status: "CANCELADO" };
}

export async function alterarStatusAgendamento(id: string, status: string, usuario?: string | null) {
  await ensureAgendaSchema();
  const d = requireDb();
  const permitidos = ["AGENDADO", "CONFIRMADO", "EM_ANDAMENTO", "REALIZADO", "NAO_COMPARECEU"];
  const novo = (status || "").toUpperCase();
  if (!permitidos.includes(novo)) throw new RegraNegocioError("Status de agendamento inválido.", 422);
  await d.execute(sql`UPDATE agendamentos SET status = ${novo}, atualizado_em = now() WHERE id = ${id};`);
  await log(d, id, "STATUS", null, null, novo, usuario ?? null);
  return { id, status: novo };
}
