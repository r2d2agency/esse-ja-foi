import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ensureEntregasSchema, garantirEntregas, listarEntregasAdmin, getEntregaAdmin, getIndicadoresEntrega,
  agendarEntrega, confirmarAgendamento, solicitarReagendamento, regerarCodigo,
  getEntregaComprador, listarEntregasComprador, getEntregaVendedor, listarEntregasVendedor,
  iniciarEntrega, registrarChegada, validarCodigo, registrarEntrega, confirmarRecebimento,
  registrarDivergencia, decidirDivergencia, registrarNaoComparecimento, cancelarAgendamento,
  adicionarObservacao, getPrazoConfirmacaoHoras, setPrazoConfirmacaoHoras,
} from "../db/entregas.server";

const uuid = z.string().uuid();

export const listarEntregasAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  await ensureEntregasSchema();
  await garantirEntregas();
  const [lista, indicadores] = await Promise.all([listarEntregasAdmin(), getIndicadoresEntrega()]);
  return { lista, indicadores, prazo_confirmacao: await getPrazoConfirmacaoHoras(), servidor_agora: new Date().toISOString() } as any;
});

export const getEntregaAdminFn = createServerFn({ method: "GET" })
  .validator((id: string) => uuid.parse(id))
  .handler(async ({ data }) => (await getEntregaAdmin(data)) as any);

export const agendarEntregaFn = createServerFn({ method: "POST" })
  .validator((data: any) =>
    z.object({
      entrega_id: uuid, tipo_local: z.string(), local_nome: z.string().optional(),
      cep: z.string().optional(), endereco: z.string().optional(), numero: z.string().optional(),
      complemento: z.string().optional(), bairro: z.string().optional(), cidade: z.string().optional(), uf: z.string().optional(),
      responsavel_recebimento: z.string().optional(), telefone_contato: z.string().optional(), orientacao: z.string().optional(),
      data_entrega: z.string().min(8), hora_inicio: z.string().min(4), hora_fim: z.string().min(4),
      admin_id: uuid, motivo: z.string().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => agendarEntrega(data));

export const confirmarAgendamentoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, papel: z.enum(["VENDEDOR", "COMPRADOR"]), autor_id: uuid }).parse(data))
  .handler(async ({ data }) => confirmarAgendamento(data.entrega_id, data.papel, data.autor_id));

export const solicitarReagendamentoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, papel: z.string(), motivo: z.string().min(3), autor_id: uuid }).parse(data))
  .handler(async ({ data }) => solicitarReagendamento(data.entrega_id, data.papel, data.motivo, data.autor_id));

export const regerarCodigoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, admin_id: uuid }).parse(data))
  .handler(async ({ data }) => regerarCodigo(data.entrega_id, data.admin_id));

export const getEntregaCompradorFn = createServerFn({ method: "GET" })
  .validator((data: any) => z.object({ entrega_id: uuid, comprador_id: uuid }).parse(data))
  .handler(async ({ data }) => {
    await ensureEntregasSchema();
    return (await getEntregaComprador(data.entrega_id, data.comprador_id)) as any;
  });

export const listarEntregasCompradorFn = createServerFn({ method: "GET" })
  .validator((id: string) => uuid.parse(id))
  .handler(async ({ data }) => {
    await ensureEntregasSchema();
    return (await listarEntregasComprador(data)) as any;
  });

export const getEntregaVendedorFn = createServerFn({ method: "GET" })
  .validator((data: any) => z.object({ entrega_id: uuid, vendedor_id: uuid }).parse(data))
  .handler(async ({ data }) => {
    await ensureEntregasSchema();
    return (await getEntregaVendedor(data.entrega_id, data.vendedor_id)) as any;
  });

export const listarEntregasVendedorFn = createServerFn({ method: "GET" })
  .validator((id: string) => uuid.parse(id))
  .handler(async ({ data }) => {
    await ensureEntregasSchema();
    return (await listarEntregasVendedor(data)) as any;
  });

export const iniciarEntregaFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, vendedor_id: uuid, lat: z.number().optional(), lng: z.number().optional() }).parse(data))
  .handler(async ({ data }) => iniciarEntrega(data.entrega_id, data.vendedor_id, { lat: data.lat, lng: data.lng }));

export const registrarChegadaFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, vendedor_id: uuid }).parse(data))
  .handler(async ({ data }) => registrarChegada(data.entrega_id, data.vendedor_id));

export const validarCodigoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, vendedor_id: uuid, codigo: z.string().min(4).max(10) }).parse(data))
  .handler(async ({ data }) => (await validarCodigo(data.entrega_id, data.vendedor_id, data.codigo)) as any);

export const registrarEntregaFn = createServerFn({ method: "POST" })
  .validator((data: any) =>
    z.object({
      entrega_id: uuid, vendedor_id: uuid, km_entrega: z.number().int().min(0).max(9999999),
      checklist: z.record(z.string(), z.boolean()),
      fotos: z.array(z.object({ categoria: z.string(), url: z.string().min(5) })).min(1),
    }).parse(data),
  )
  .handler(async ({ data }) => (await registrarEntrega(data)) as any);

export const confirmarRecebimentoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, comprador_id: uuid }).parse(data))
  .handler(async ({ data }) => confirmarRecebimento(data.entrega_id, data.comprador_id));

export const registrarDivergenciaFn = createServerFn({ method: "POST" })
  .validator((data: any) =>
    z.object({
      entrega_id: uuid, comprador_id: uuid, motivo: z.string().min(2), descricao: z.string().min(5),
      fotos: z.array(z.object({ url: z.string().min(5) })).optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => registrarDivergencia(data));

export const decidirDivergenciaFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, decisao: z.enum(["LIBERAR", "MANTER_BLOQUEIO", "TRATATIVA_MANUAL"]), observacao: z.string().min(3), admin_id: uuid }).parse(data))
  .handler(async ({ data }) => decidirDivergencia(data));

export const registrarNaoComparecimentoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, parte: z.enum(["VENDEDOR", "COMPRADOR"]), observacao: z.string().min(3), autor_id: uuid }).parse(data))
  .handler(async ({ data }) => registrarNaoComparecimento(data));

export const cancelarAgendamentoFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, motivo: z.string().min(3), admin_id: uuid }).parse(data))
  .handler(async ({ data }) => cancelarAgendamento(data));

export const adicionarObservacaoEntregaFn = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ entrega_id: uuid, texto: z.string().min(3), autor_id: uuid }).parse(data))
  .handler(async ({ data }) => adicionarObservacao(data.entrega_id, data.texto, data.autor_id));

export const setPrazoConfirmacaoFn = createServerFn({ method: "POST" })
  .validator((horas: number) => z.number().int().positive().max(240).parse(horas))
  .handler(async ({ data }) => setPrazoConfirmacaoHoras(data));
