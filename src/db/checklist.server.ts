import { sql } from "drizzle-orm";
import { db } from "./index";
import { RegraNegocioError, type Row } from "./cadastro.server";

function requireDb() {
  if (!db) throw new RegraNegocioError("Banco de dados indisponível. Verifique a DATABASE_URL.", 503);
  return db;
}

let prepared = false;

/** Tabelas de checklist (modelos versionados, itens) e catálogo de acessórios. Idempotente. */
export async function ensureChecklistSchema() {
  if (prepared) return;
  const d = requireDb();

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS checklist_modelos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      codigo text NOT NULL,
      nome text NOT NULL,
      descricao text,
      versao integer NOT NULL DEFAULT 1,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now(),
      atualizado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  await d.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS checklist_modelos_codigo_versao_uidx ON checklist_modelos (codigo, versao);`);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS checklist_itens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      modelo_id uuid NOT NULL REFERENCES checklist_modelos(id) ON DELETE CASCADE,
      categoria text NOT NULL DEFAULT 'GERAL',
      titulo text NOT NULL,
      ajuda text,
      tipo text NOT NULL DEFAULT 'OK_AVARIA',
      obrigatorio boolean NOT NULL DEFAULT true,
      exige_foto boolean NOT NULL DEFAULT false,
      ordem integer NOT NULL DEFAULT 0,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);
  await d.execute(sql`CREATE INDEX IF NOT EXISTS checklist_itens_modelo_idx ON checklist_itens (modelo_id, ordem);`);

  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS acessorios_catalogo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      categoria text,
      ativo boolean NOT NULL DEFAULT true,
      criado_em timestamptz NOT NULL DEFAULT now()
    );
  `);

  prepared = true;
}

export type ItemInput = {
  categoria: string;
  titulo: string;
  ajuda?: string | null | undefined;
  tipo?: string | null | undefined;
  obrigatorio?: boolean | undefined;
  exigeFoto?: boolean | undefined;
};

export async function listarModelos() {
  await ensureChecklistSchema();
  const d = requireDb();
  return (await d.execute(sql`
    SELECT m.*,
           (SELECT count(*) FROM checklist_itens i WHERE i.modelo_id = m.id) AS total_itens,
           (SELECT count(*) FROM information_schema.tables WHERE table_name = 'laudos') > 0 AS tem_laudos
    FROM checklist_modelos m
    ORDER BY m.codigo, m.versao DESC;
  `)) as unknown as Array<Row>;
}

export async function obterModelo(id: string) {
  await ensureChecklistSchema();
  const d = requireDb();
  const modelos = (await d.execute(sql`SELECT * FROM checklist_modelos WHERE id = ${id}::uuid LIMIT 1;`)) as unknown as Array<Row>;
  const modelo = modelos[0];
  if (!modelo) throw new RegraNegocioError("Modelo de checklist não encontrado.", 404);
  const itens = (await d.execute(sql`
    SELECT * FROM checklist_itens WHERE modelo_id = ${id}::uuid ORDER BY categoria, ordem;
  `)) as unknown as Array<Row>;
  return { modelo, itens };
}

export async function modeloAtivo(codigo = "PADRAO") {
  await ensureChecklistSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`
    SELECT * FROM checklist_modelos WHERE ativo = true AND upper(codigo) = ${codigo.toUpperCase()}
    ORDER BY versao DESC LIMIT 1;
  `)) as unknown as Array<Row>;
  if (rows[0]) return rows[0];
  const qualquer = (await d.execute(sql`
    SELECT * FROM checklist_modelos WHERE ativo = true ORDER BY versao DESC LIMIT 1;
  `)) as unknown as Array<Row>;
  return qualquer[0] ?? null;
}

async function modeloEmUso(modeloId: string) {
  const d = requireDb();
  const existe = (await d.execute(sql`
    SELECT count(*) > 0 AS existe FROM information_schema.tables WHERE table_name = 'laudos';
  `)) as unknown as Array<Record<string, boolean>>;
  if (!existe[0]?.['existe']) return false;
  const rows = (await d.execute(sql`
    SELECT count(*)::int AS total FROM laudos WHERE modelo_id = ${modeloId}::uuid;
  `)) as unknown as Array<Record<string, number>>;
  return Number(rows[0]?.['total'] ?? 0) > 0;
}

async function gravarItens(modeloId: string, itens: Array<ItemInput>) {
  const d = requireDb();
  await d.execute(sql`DELETE FROM checklist_itens WHERE modelo_id = ${modeloId}::uuid;`);
  let ordem = 0;
  for (const item of itens) {
    ordem += 1;
    await d.execute(sql`
      INSERT INTO checklist_itens (modelo_id, categoria, titulo, ajuda, tipo, obrigatorio, exige_foto, ordem)
      VALUES (${modeloId}::uuid, ${(item.categoria || "GERAL").toUpperCase()}, ${item.titulo},
              ${item.ajuda ?? null}, ${(item.tipo ?? "OK_AVARIA").toUpperCase()},
              ${item.obrigatorio ?? true}, ${item.exigeFoto ?? false}, ${ordem});
    `);
  }
}

/**
 * Salva um modelo. Se o modelo já estiver em uso por algum laudo, cria uma NOVA VERSÃO
 * (o modelo antigo permanece intacto e os laudos antigos continuam apontando para ele).
 */
export async function salvarModelo(input: {
  id?: string | undefined;
  codigo: string;
  nome: string;
  descricao?: string | null | undefined;
  itens: Array<ItemInput>;
}) {
  await ensureChecklistSchema();
  const d = requireDb();
  const codigo = (input.codigo || "PADRAO").trim().toUpperCase().replace(/\s+/g, "_");
  if (!input.nome?.trim()) throw new RegraNegocioError("Informe o nome do modelo.", 422);
  if (!input.itens?.length) throw new RegraNegocioError("Adicione pelo menos um item ao checklist.", 422);

  if (!input.id) {
    const versoes = (await d.execute(sql`
      SELECT coalesce(max(versao), 0)::int AS v FROM checklist_modelos WHERE codigo = ${codigo};
    `)) as unknown as Array<Record<string, number>>;
    const versao = Number(versoes[0]?.['v'] ?? 0) + 1;
    await d.execute(sql`UPDATE checklist_modelos SET ativo = false WHERE codigo = ${codigo};`);
    const rows = (await d.execute(sql`
      INSERT INTO checklist_modelos (codigo, nome, descricao, versao, ativo)
      VALUES (${codigo}, ${input.nome.trim()}, ${input.descricao ?? null}, ${versao}, true)
      RETURNING *;
    `)) as unknown as Array<Row>;
    const modelo = rows[0]!;
    await gravarItens(String(modelo['id']), input.itens);
    return { modelo, novaVersao: versao > 1 };
  }

  const emUso = await modeloEmUso(input.id);
  if (emUso) {
    const atual = (await d.execute(sql`SELECT * FROM checklist_modelos WHERE id = ${input.id}::uuid LIMIT 1;`)) as unknown as Array<Row>;
    if (!atual[0]) throw new RegraNegocioError("Modelo não encontrado.", 404);
    const versoes = (await d.execute(sql`
      SELECT coalesce(max(versao), 0)::int AS v FROM checklist_modelos WHERE codigo = ${codigo};
    `)) as unknown as Array<Record<string, number>>;
    const versao = Number(versoes[0]?.['v'] ?? 0) + 1;
    await d.execute(sql`UPDATE checklist_modelos SET ativo = false WHERE codigo = ${codigo};`);
    const rows = (await d.execute(sql`
      INSERT INTO checklist_modelos (codigo, nome, descricao, versao, ativo)
      VALUES (${codigo}, ${input.nome.trim()}, ${input.descricao ?? null}, ${versao}, true)
      RETURNING *;
    `)) as unknown as Array<Row>;
    const modelo = rows[0]!;
    await gravarItens(String(modelo['id']), input.itens);
    return { modelo, novaVersao: true };
  }

  const rows = (await d.execute(sql`
    UPDATE checklist_modelos SET nome = ${input.nome.trim()}, descricao = ${input.descricao ?? null},
      codigo = ${codigo}, atualizado_em = now()
    WHERE id = ${input.id}::uuid RETURNING *;
  `)) as unknown as Array<Row>;
  if (!rows[0]) throw new RegraNegocioError("Modelo não encontrado.", 404);
  await gravarItens(input.id, input.itens);
  return { modelo: rows[0], novaVersao: false };
}

export async function ativarModelo(id: string) {
  await ensureChecklistSchema();
  const d = requireDb();
  const rows = (await d.execute(sql`SELECT * FROM checklist_modelos WHERE id = ${id}::uuid LIMIT 1;`)) as unknown as Array<Row>;
  const modelo = rows[0];
  if (!modelo) throw new RegraNegocioError("Modelo não encontrado.", 404);
  await d.execute(sql`UPDATE checklist_modelos SET ativo = false WHERE codigo = ${modelo['codigo'] as string};`);
  await d.execute(sql`UPDATE checklist_modelos SET ativo = true, atualizado_em = now() WHERE id = ${id}::uuid;`);
  return { ok: true };
}

export async function excluirModelo(id: string) {
  await ensureChecklistSchema();
  const d = requireDb();
  if (await modeloEmUso(id)) {
    throw new RegraNegocioError("Este modelo já foi usado em laudos e não pode ser excluído. Desative-o.", 409);
  }
  await d.execute(sql`DELETE FROM checklist_modelos WHERE id = ${id}::uuid;`);
  return { ok: true };
}

export async function listarAcessorios(incluirInativos = false) {
  await ensureChecklistSchema();
  const d = requireDb();
  return (await d.execute(sql`
    SELECT * FROM acessorios_catalogo
    WHERE (${incluirInativos} OR ativo = true)
    ORDER BY coalesce(categoria, ''), nome;
  `)) as unknown as Array<Row>;
}

export async function salvarAcessorio(input: {
  id?: string | undefined;
  nome: string;
  categoria?: string | null | undefined;
  ativo?: boolean | undefined;
}) {
  await ensureChecklistSchema();
  const d = requireDb();
  if (!input.nome?.trim()) throw new RegraNegocioError("Informe o nome do acessório.", 422);
  if (input.id) {
    const rows = (await d.execute(sql`
      UPDATE acessorios_catalogo SET nome = ${input.nome.trim()}, categoria = ${input.categoria ?? null},
        ativo = ${input.ativo ?? true}
      WHERE id = ${input.id}::uuid RETURNING *;
    `)) as unknown as Array<Row>;
    if (!rows[0]) throw new RegraNegocioError("Acessório não encontrado.", 404);
    return rows[0];
  }
  const rows = (await d.execute(sql`
    INSERT INTO acessorios_catalogo (nome, categoria, ativo)
    VALUES (${input.nome.trim()}, ${input.categoria ?? null}, ${input.ativo ?? true})
    RETURNING *;
  `)) as unknown as Array<Row>;
  return rows[0]!;
}

export async function excluirAcessorio(id: string) {
  await ensureChecklistSchema();
  const d = requireDb();
  await d.execute(sql`UPDATE acessorios_catalogo SET ativo = false WHERE id = ${id}::uuid;`);
  return { ok: true };
}