import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const gerarPdfLaudoFn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ laudoId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { gerarPdfLaudo } = await import("@/db/laudos.server");
    return gerarPdfLaudo(data.laudoId);
  });
