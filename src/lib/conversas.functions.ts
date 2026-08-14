import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as db from "../db/conversas.server";

export const listarConversasFn = createServerFn({ method: "GET" })
  .validator((filtros: any) => filtros)
  .handler(async ({ data: filtros }) => {
    return db.listarConversas(filtros);
  });

export const getConversaCompletaFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    return db.getConversaCompleta(id);
  });

export const enviarMensagemAtendenteFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data, context }) => {
    const atendenteId = (context as any).userId;
    if (!atendenteId) throw new Error("Não autorizado");
    return db.enviarMensagemAtendente(data.conversaId, atendenteId, data.payload);
  });
