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
  const salt = Uint8Array.from(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
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
}

export async function hashPassword(password: string) {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const iterations = 120_000;
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !hash) return false;
  const candidate = await pbkdf2(password, salt, Number(iter));
  if (candidate.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ candidate.charCodeAt(i);
  return diff === 0;
}

/** Cria as colunas de senha/proteção, o gatilho anti-exclusão e o superadmin. Idempotente. */
export async function ensureSuperAdmin() {
  if (!db) {
    console.error("❌ ensureSuperAdmin: DATABASE_URL ausente.");
    return;
  }

  await db.execute(sql`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS senha_hash text;
  `);
  await db.execute(sql`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS protegido boolean NOT NULL DEFAULT false;
  `);

  // Bloqueia exclusão e rebaixamento do superadmin diretamente no banco
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

  const senha = await hashPassword(SUPERADMIN_PASSWORD);

  await db.execute(sql`
    INSERT INTO profiles (nome, email, role, ativo, protegido, senha_hash)
    VALUES (${SUPERADMIN_NAME}, ${SUPERADMIN_EMAIL}, 'admin', true, true, ${senha})
    ON CONFLICT (email) DO UPDATE
      SET protegido = true,
          role = 'admin',
          ativo = true,
          senha_hash = COALESCE(profiles.senha_hash, EXCLUDED.senha_hash);
  `);

  console.log("✅ Superadmin garantido:", SUPERADMIN_EMAIL);
}

export async function authenticate(email: string, password: string) {
  if (!db) throw new Error("Banco de dados indisponível.");
  const rows: any = await db.execute(sql`
    SELECT id, nome, email, role, ativo, senha_hash
    FROM profiles WHERE lower(email) = lower(${email}) LIMIT 1
  `);
  const user = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
  if (!user || !user.ativo || !user.senha_hash) return null;
  const ok = await verifyPassword(password, user.senha_hash);
  if (!ok) return null;
  return {
    id: String(user.id),
    name: user.nome ?? user.email,
    email: user.email as string,
    role: user.role as "admin" | "operacao" | "vistoriador" | "comprador",
  };
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
