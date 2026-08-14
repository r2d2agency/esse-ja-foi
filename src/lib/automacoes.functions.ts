import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as db from "../db/automacoes.server";

export const listarAutomacoesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return db.listarAutomacoes();
  });

export const salvarAutomacaoFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId || '00000000-0000-0000-0000-000000000000';
    return db.salvarAutomacao(data, userId);
  });

export const getExecucoesAutomacaoFn = createServerFn({ method: "GET" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    return db.getExecucoesAutomacao(id);
  });

