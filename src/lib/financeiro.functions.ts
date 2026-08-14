import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  autorizarRepasse, 
  confirmarConclusaoRepasse, 
  getIndicadoresFinanceiros, 
  getRepasse, 
  listarRepassesAdmin, 
  salvarDadosBancarios 
} from "../db/financeiro.server";

export const getIndicadoresFinanceirosFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return await getIndicadoresFinanceiros();
  });

export const listarRepassesAdminFn = createServerFn({ method: "GET" })
  .validator((status?: string) => status)
  .handler(async ({ data: status }) => {
    return await listarRepassesAdmin(status);
  });

export const getRepasseFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    return await getRepasse(id);
  });

export const autorizarRepasseFn = createServerFn({ method: "POST" })
  .validator((data: { repasseId: string; adminId: string }) => data)
  .handler(async ({ data }) => {
    return await autorizarRepasse(data.repasseId, data.adminId);
  });

export const confirmarConclusaoRepasseFn = createServerFn({ method: "POST" })
  .validator((data: { repasseId: string; id_externo?: string; comprovante_url?: string }) => data)
  .handler(async ({ data }) => {
    return await confirmarConclusaoRepasse(data.repasseId, data);
  });

export const salvarDadosBancariosFn = createServerFn({ method: "POST" })
  .validator((data: { 
    vendedorId: string; 
    tipo_chave: string; 
    chave_pix: string; 
    titular_nome: string; 
    titular_documento: string; 
  }) => data)
  .handler(async ({ data }) => {
    return await salvarDadosBancarios(data.vendedorId, data);
  });
