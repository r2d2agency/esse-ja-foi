import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const compradorSchema = z.object({
  tipo: z.enum(["PF", "PJ"]),
  nome: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  whatsapp: z.string(),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
});

export const cadastrarCompradorFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => compradorSchema.parse(data))
  .handler(async ({ data }) => {
    const { cadastrarComprador } = await import("../db/comprador.server");
    return cadastrarComprador(data);
  });

export const getStatusCompradorFn = createServerFn({ method: "GET" })
  .inputValidator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    const { getStatusComprador } = await import("../db/comprador.server");
    return getStatusComprador(id);
  });

export const atualizarDadosCompradorFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    id: z.string().uuid(),
    dados: z.any()
  }).parse(data))
  .handler(async ({ data }) => {
    const { atualizarDadosComprador } = await import("../db/comprador.server");
    return atualizarDadosComprador(data.id, data.dados);
  });

export const enviarDocumentoCompradorFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => z.object({
    compradorId: z.string().uuid(),
    tipo: z.string(),
    url: z.string()
  }).parse(data))
  .handler(async ({ data }) => {
    const { salvarDocumentoComprador } = await import("../db/comprador.server");
    return salvarDocumentoComprador(data.compradorId, data.tipo, data.url);
  });
