import { sql } from 'drizzle-orm';
import { db } from './index';

const COLUNAS: [string, string][] = [
  ['senha_hash', 'text'],
  ['cpf', 'text'],
  ['cep', 'text'],
  ['endereco', 'text'],
  ['numero', 'text'],
  ['bairro', 'text'],
  ['complemento', 'text'],
  ['cidade', 'text'],
  ['uf', 'text'],
  ['documento_cnh_url', 'text'],
  ['documento_crlv_url', 'text'],
  ['documento_selfie_url', 'text'],
  ['cadastro_completo', 'boolean NOT NULL DEFAULT false'],
  ['atualizado_em', 'timestamptz NOT NULL DEFAULT now()'],
];

let pronto = false;

/** Garante que as colunas de perfil existam antes de leituras/escritas. */
export async function ensurePerfilSchema() {
  if (pronto || !db) return;
  try {
    for (const [nome, tipo] of COLUNAS) {
      await db.execute(sql.raw(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${nome} ${tipo};`));
    }
    pronto = true;
  } catch (e) {
    console.error('Falha ao garantir colunas de profiles:', e);
  }
}
