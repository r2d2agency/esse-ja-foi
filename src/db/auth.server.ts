import { sql } from "drizzle-orm";
import { db } from "./index";

export const SUPERADMIN_EMAIL = "tnicodemos@gmail.com";
const SUPERADMIN_PASSWORD = "@N3tw0rk$";
const SUPERADMIN_NAME = "Super Admin";

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function pbkdf2(password: string, saltHex: string, iterations = 120_000) {
  try {
    const saltParts = saltHex.match(/.{2}/g);
    if (!saltParts) return "";
    const salt = Uint8Array.from(
      saltParts.map((h) => parseInt(h, 16)),
    );
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
      key,
      256,
    );
    return toHex(bits);
  } catch (err) {
    console.error("[auth.server] Erro no pbkdf2:", err);
    return "";
  }
}

export async function hashPassword(password: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const iterations = 120_000;
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  try {
    const [scheme, iter, salt, hash] = stored.split("$");
    if (scheme !== "pbkdf2" || !iter || !salt || !hash) return false;
    const candidate = await pbkdf2(password, salt, Number(iter));
    if (candidate.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ candidate.charCodeAt(i);
    return diff === 0;
  } catch (err) {
    console.error("[auth.server] Erro ao verificar senha:", err);
    return false;
  }
}

/** Cria as colunas de senha/proteção, o gatilho anti-exclusão e o superadmin. Idempotente. */
export async function ensureSuperAdmin(silent = true) {
  if (!db) {
    throw new Error("DATABASE_URL ausente.");
  }
  
  try {
    const adminModule = await import("./admin.server");
    const ensureAdminTables = adminModule.ensureAdminTables;

    // Garante que o enum app_role exista e tenha todos os valores necessários
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'app_role') THEN
          CREATE TYPE app_role AS ENUM ('admin', 'operacao', 'vistoriador', 'comprador', 'vendedor');
        ELSE
          -- Garante que cada valor exista individualmente
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'admin') THEN
            ALTER TYPE app_role ADD VALUE 'admin';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'operacao') THEN
            ALTER TYPE app_role ADD VALUE 'operacao';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'vistoriador') THEN
            ALTER TYPE app_role ADD VALUE 'vistoriador';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'comprador') THEN
            ALTER TYPE app_role ADD VALUE 'comprador';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'app_role' AND e.enumlabel = 'vendedor') THEN
            ALTER TYPE app_role ADD VALUE 'vendedor';
          END IF;
        END IF;
      EXCEPTION 
        WHEN others THEN 
          RAISE NOTICE 'Erro ao atualizar app_role: %', SQLERRM;
      END $$;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text,
        telefone text,
        whatsapp text,
        email text NOT NULL UNIQUE,
        role app_role NOT NULL DEFAULT 'comprador',
        ativo boolean NOT NULL DEFAULT true,
        criado_em timestamp NOT NULL DEFAULT now(),
        atualizado_em timestamp NOT NULL DEFAULT now(),
        senha_hash text,
        protegido boolean NOT NULL DEFAULT false,
        cpf text,
        cep text,
        endereco text,
        cidade text,
        uf text,
        documento_cnh_url text,
        documento_crlv_url text,
        documento_selfie_url text,
        cadastro_completo boolean NOT NULL DEFAULT false
      );
    `);
  } catch (e) {
    console.error("Erro ao garantir tabela profiles:", e);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS veiculos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        placa text NOT NULL UNIQUE,
        marca text NOT NULL,
        modelo text NOT NULL,
        status text NOT NULL DEFAULT 'cadastrado',
        criado_em timestamp NOT NULL DEFAULT now(),
        perfil_id uuid REFERENCES profiles(id),
        km integer,
        valor_interesse_cliente numeric,
        observacoes text
      );
    `);
  } catch (e) {
    console.error("Erro ao garantir tabela veiculos:", e);
  }

  // Bloqueia exclusão e rebaixamento do superadmin diretamente no banco
  try {
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION protege_superadmin() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          IF OLD.protegido THEN
            RAISE EXCEPTION 'Este usuário é protegido e não pode ser excluído.';
          END IF;
          RETURN OLD;
        ELSE
          IF OLD.protegido THEN
            NEW.protegido := true;
            NEW.role := 'admin';
            NEW.ativo := true;
            NEW.email := OLD.email;
          END IF;
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await db.execute(sql`DROP TRIGGER IF EXISTS trg_protege_superadmin ON profiles;`);
    await db.execute(sql`
      CREATE TRIGGER trg_protege_superadmin
      BEFORE UPDATE OR DELETE ON profiles
      FOR EACH ROW EXECUTE FUNCTION protege_superadmin();
    `);
  } catch (e) {
    console.warn("[auth.server] Erro ao criar gatilho de proteção (pode ser falta de privilégio superuser):", (e as Error).message);
  }

  const senha = await hashPassword(SUPERADMIN_PASSWORD);
  const cadastroModule = await import("./cadastro.server");
  const ensureCadastroSchema = cadastroModule.ensureCadastroSchema;
  
  await ensureCadastroSchema(silent);
  await ensureAdminTables(silent);

  // Garante que o enum seja criado antes de qualquer tentativa de inserção
  // e remove qualquer ambiguidade de tipo.
  await db.execute(sql`
    INSERT INTO profiles (nome, email, role, ativo, protegido, senha_hash, cpf, cep, endereco, cidade, uf)
    VALUES (${SUPERADMIN_NAME}, ${SUPERADMIN_EMAIL}, 'admin'::text::app_role, true, true, ${senha}, '00000000000', '00000000', 'Endereço Admin', 'Cidade', 'UF')
    ON CONFLICT (email) DO UPDATE
      SET protegido = true,
          role = 'admin'::text::app_role,
          ativo = true,
          senha_hash = COALESCE(profiles.senha_hash, EXCLUDED.senha_hash);
  `);

  if (!silent && process.env['NODE_ENV'] === 'development') console.log("✅ Superadmin garantido:", SUPERADMIN_EMAIL);
} catch (err) {
  console.error("[auth.server] Erro fatal no ensureSuperAdmin:", err);
}
}

export async function authenticate(email: string, password: string) {
  if (!db) throw new Error("Banco de dados indisponível.");
  // Silenced log to prevent cluttering stdout during requests
  try {
    await ensureSuperAdmin();
    const rows: any = await db.execute(sql`
      SELECT id, nome, email, role, ativo, senha_hash
      FROM profiles WHERE lower(email) = lower(${email}) LIMIT 1
    `);
    const user = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
    if (!user) {
      console.warn("[auth.server] Usuário não encontrado:", email);
      return null;
    }
    if (!user.ativo) {
      console.warn("[auth.server] Usuário inativo:", email);
      return null;
    }
    if (!user.senha_hash) {
      console.warn("[auth.server] Usuário sem hash de senha:", email);
      return null;
    }
    const ok = await verifyPassword(password, user.senha_hash);
    if (!ok) {
      console.warn("[auth.server] Senha incorreta para:", email);
      return null;
    }
    // Silenced log to prevent cluttering stdout during requests
    return {
      id: String(user.id),
      nome: user.nome ?? user.email,
      email: user.email as string,
      role: user.role as any,
      pode_ver_valores: !!(user as any).pode_ver_valores,
      tipo_pessoa: (user as any).tipo_pessoa,
    };
  } catch (err) {
    console.error("[auth.server] Erro durante autenticação:", err);
    throw err;
  }
}

export async function issueToken(userId: string) {
  const secret = process.env["SESSION_SECRET"] ?? "esse-ja-foi-dev-secret";
  const payload = btoa(JSON.stringify({ sub: userId, exp: Date.now() + 1000 * 60 * 60 * 12 }));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${payload}.${sig}`;
}
