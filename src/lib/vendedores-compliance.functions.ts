import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listarVendedoresFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ 
    status: z.string().optional(), 
    busca: z.string().optional() 
  }).parse(d))
  .handler(async ({ data }) => {
    const { listarVendedores } = await import("@/db/vendedores-compliance.server");
    return { 
      ok: true, 
      data: await listarVendedores({
        status: data.status,
        busca: data.busca
      }) 
    };
  });
