import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Row } from "@/db/dashboard.server";

export const dashboardAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("@/db/dashboard.server");
  const [indicadores, recentes, leads, leadsTotais] = await Promise.all([
    m.indicadoresAdmin(),
    m.veiculosRecentes(10),
    m.leadsRecentes(10),
    m.totaisLeads(),
  ]);
  return { indicadores, recentes, leads, leadsTotais, bancoOk: m.bancoDisponivel() };
});

export const dashboardOperacaoFn = createServerFn({ method: "GET" }).handler(async () => {
  const m = await import("@/db/dashboard.server");
  const [indicadores, fila] = await Promise.all([m.indicadoresAdmin(), m.filaOperacao()]);
  return { indicadores, fila };
});

export const dashboardCompradorFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ email: z.string().email().or(z.literal("")) }).parse(d ?? { email: "" }))
  .handler(async ({ data }) => {
    const m = await import("@/db/dashboard.server");
    const [abertos, lances] = await Promise.all([
      m.leiloesAbertos(),
      data.email ? m.meusLances(data.email) : Promise.resolve([] as Array<Row>),
    ]);
    return { abertos, lances };
  });
