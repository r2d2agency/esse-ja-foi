import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarVendedoresFn = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().optional(), busca: z.string().optional() }))
  .handler(async ({ data }) => {
    const { listarVendedores } = await import("@/db/vendedores-compliance.server");
    return { ok: true, data: await listarVendedores(data) };
  });
