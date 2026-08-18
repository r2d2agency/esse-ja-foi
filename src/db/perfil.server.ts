import { sql } from 'drizzle-orm';
import { db } from './index';

const COLUNAS: [string, string][] = [
  ['senha_hash', 'text'],
  ['cpf', 'text'],
  ['cnpj', 'text'],
  ['cep', 'text'],
  ['endereco', 'text'],
  ['numero', 'text'],
  ['bairro', 'text'],
  ['complemento', 'text'],
  ['cidade', 'text'],
  ['uf', 'text'],
  ['documento_cnh_url', 'text'],
  ['documento_cnh_verso_url', 'text'],
  ['documento_crlv_url', 'text'],
  ['documento_selfie_url', 'text'],
  ['documento_comprovante_endereco_url', 'text'],
  ['cadastro_completo', 'boolean NOT NULL DEFAULT false'],
  ['tipo_pessoa', 'text DEFAULT \'PF\''],
  ['status_compliance', 'text DEFAULT \'NAO_ENVIADO\''],
  ['compliance_motivo_pendencia', 'text'],
  ['compliance_data_analise', 'timestamptz'],
  ['compliance_responsavel_id', 'uuid'],
  ['responsavel_nome', 'text'],
  ['pode_ver_valores', 'boolean NOT NULL DEFAULT false'],
  ['atualizado_em', 'timestamptz NOT NULL DEFAULT now()'],
  ['data_nascimento', 'text'],
  ['estado_civil', 'text'],
  ['profissao', 'text'],
  ['nome_mae', 'text'],
];

let pronto = false;

/** Garante que as colunas de perfil existam antes de leituras/escritas. */
export async function ensurePerfilSchema() {
  if (pronto || !db) return;
  try {
    for (const [nome, tipo] of COLUNAS) {
      try {
        await db.execute(sql.raw(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ${nome} ${tipo};`));
      } catch (e) {
        if (!(e as any).message?.includes("already exists")) {
          throw e;
        }
      }
    }
    
    // Garantir grants
    await db.execute(sql`
      DO $$ 
      BEGIN
        EXECUTE 'GRANT SELECT, UPDATE ON public.profiles TO authenticated';
        EXECUTE 'GRANT SELECT ON public.profiles TO anon';
        EXECUTE 'GRANT ALL ON public.profiles TO service_role';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao conceder grants em profiles: %', SQLERRM;
      END $$;
    `);


    pronto = true;
  } catch (e) {
    if (process.env['NODE_ENV'] === 'development') console.error('Falha ao garantir colunas de profiles:', e);
  }
}

