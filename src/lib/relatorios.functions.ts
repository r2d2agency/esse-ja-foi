import { createServerFn } from "@tanstack/react-start";
import { getRelatoriosGerais, getRelatoriosVendas } from "@/db/relatorios.server";
import { z } from "zod";

const FilterSchema = z.object({
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
});

export const getRelatoriosGeraisFn = createServerFn({ method: "GET" })
  .input(FilterSchema)
  .handler(async ({ input }) => {
    try {
      const data = await getRelatoriosGerais(input);
      return { ok: true as const, data };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const getRelatoriosVendasFn = createServerFn({ method: "GET" })
  .input(FilterSchema)
  .handler(async ({ input }) => {
    try {
      const data = await getRelatoriosVendas(input);
      return { ok: true as const, data };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });
