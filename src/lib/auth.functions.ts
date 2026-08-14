import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const seedSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { ensureSuperAdmin, SUPERADMIN_EMAIL } = await import("@/db/auth.server");
  try {
    await ensureSuperAdmin();
    return { ok: true as const, email: SUPERADMIN_EMAIL };
  } catch (error) {
    console.error("Falha ao criar superadmin:", error);
    return { ok: false as const, error: (error as Error).message };
  }
});

export const loginWithPassword = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ 
    email: z.string().email(), 
    password: z.string().min(1) 
  }).parse(data))
  .handler(async ({ data }) => {
    const { authenticate, issueToken } = await import("@/db/auth.server");
    try {
      const user = await authenticate(data.email, data.password);
      if (!user) return { ok: false as const, message: "E-mail ou senha inválidos." };
      return { ok: true as const, user, accessToken: await issueToken(user.id) };
    } catch (error: any) {
      console.error("Falha na autenticação:", error);
      
      const { db: database } = await import("@/db/index");
      if (database) {
        try {
          const { sql } = await import("drizzle-orm");
          await database.execute(sql`
            INSERT INTO logs (entidade, acao, detalhe, usuario)
            VALUES ('auth', 'LOGIN_ERRO', ${JSON.stringify({ error: error.message, email: data.email })}, ${data.email})
          `);
        } catch (logErr) {
          console.error("Erro ao registrar log de login:", logErr);
        }
      }

      return {
        ok: false as const,
        message: "Não foi possível acessar o banco de dados. Verifique a DATABASE_URL e tente novamente.",
      };
    }
  });

export const solicitarResetSenha = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { db } = await import("@/db/index");
      const { ensureCadastroSchema } = await import("@/db/cadastro.server");
      const { sql } = await import("drizzle-orm");
      if (!db) return { ok: false as const, message: "Banco de dados indisponível no momento." };
      await ensureCadastroSchema();
      await db.execute(sql`
        INSERT INTO logs (entidade, acao, detalhe, usuario)
        VALUES (${"auth"}, ${"RESET_SENHA_SOLICITADO"}, ${data.email.toLowerCase()}, ${data.email.toLowerCase()});
      `);
      return { ok: true as const };
    } catch (error) {
      console.error("Falha ao registrar solicitação de reset:", error);
      return { ok: false as const, message: "Não foi possível registrar a solicitação. Tente novamente." };
    }
  });
