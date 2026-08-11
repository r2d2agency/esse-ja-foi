import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
  .inputValidator((data: unknown) => credentials.parse(data))
  .handler(async ({ data }) => {
    const { authenticate, issueToken } = await import("@/db/auth.server");
    try {
      const user = await authenticate(data.email, data.password);
      if (!user) return { ok: false as const, message: "E-mail ou senha inválidos." };
      return { ok: true as const, user, accessToken: await issueToken(user.id) };
    } catch (error) {
      console.error("Falha na autenticação:", error);
      return {
        ok: false as const,
        message: "Não foi possível acessar o banco de dados. Verifique a DATABASE_URL e tente novamente.",
      };
    }
  });
