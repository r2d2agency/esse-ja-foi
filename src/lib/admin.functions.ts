import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarVendedoresFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const m = await import("@/db/admin.server");
    await m.ensureAdminTables();
    try {
      return { ok: true as const, data: await m.listarVendedoresPendentes() };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const gerenciarUsuarioFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), ativo: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/admin.server");
    try {
      await m.alterarStatusUsuario(data.id, data.ativo);
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const listarConfiguracoesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const m = await import("@/db/admin.server");
    await m.ensureAdminTables();
    try {
      return { ok: true as const, data: await m.listarConfiguracoes() };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const salvarConfiguracaoFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ chave: z.string(), valor: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const m = await import("@/db/admin.server");
    try {
      await m.salvarConfiguracao(data.chave, data.valor);
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });
