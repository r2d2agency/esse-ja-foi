import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listarAnunciosVitrine, getDetalheAnuncioPublico } from "../db/vitrine.server";

export const getVitrine = createServerFn({ method: "GET" })
  .handler(async () => {
    return listarAnunciosVitrine();
  });

export const getAnuncioPublico = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => z.string().parse(slug))
  .handler(async ({ data: slug }) => {
    return getDetalheAnuncioPublico(slug);
  });
