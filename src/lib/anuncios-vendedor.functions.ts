import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../db";
import { sql } from "drizzle-orm";

export const getAnuncioVeiculoVendedor = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: veiculoId }) => {
    const d = db;
    if (!d) return null;
    const res = await d.execute(sql`
      SELECT * FROM anuncios_veiculo WHERE veiculo_id = ${veiculoId}::uuid
    `);
    return (res as any).rows[0] || null;
  });
