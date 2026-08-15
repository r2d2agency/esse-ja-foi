import { createServerFn } from "@tanstack/react-start";
import { getRelatoriosGerais, getRelatoriosVendas } from "@/db/relatorios.server";
import { z } from "zod";

const FilterSchema = z.object({
  dataInicio: z.string().nullable().optional(),
  dataFim: z.string().nullable().optional(),
});


export const getRelatoriosGeraisFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => FilterSchema.parse(data))
  .handler(async ({ data }) => {

    try {
      const res = await getRelatoriosGerais(data);
      return { ok: true as const, data: res };

    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const getRelatoriosVendasFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => FilterSchema.parse(data))
  .handler(async ({ data }) => {

    try {
      const res = await getRelatoriosVendas(data);
      return { ok: true as const, data: res };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });
