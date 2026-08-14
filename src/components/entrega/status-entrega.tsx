import { Badge } from "@/components/ui/badge";

export const ROTULO_ENTREGA: Record<string, string> = {
  AGUARDANDO_ORGANIZACAO: "Aguardando organização da entrega",
  AGUARDANDO_AGENDAMENTO: "Aguardando agendamento",
  ENTREGA_AGENDADA: "Entrega agendada",
  REAGENDAMENTO_SOLICITADO: "Reagendamento solicitado",
  AGUARDANDO_ENTREGA: "Aguardando entrega",
  EM_PROCESSO_DE_ENTREGA: "Em processo de entrega",
  AGUARDANDO_CONFIRMACAO_COMPRADOR: "Aguardando confirmação do comprador",
  ENTREGA_CONFIRMADA: "Entrega confirmada",
  DIVERGENCIA_NA_ENTREGA: "Divergência na entrega",
  ENTREGA_CANCELADA: "Entrega cancelada",
  NAO_COMPARECIMENTO_VENDEDOR: "Não comparecimento do vendedor",
  NAO_COMPARECIMENTO_COMPRADOR: "Não comparecimento do comprador",
  LIBERADO_PARA_REPASSE: "Liberado para repasse",
};

const CLASSE: Record<string, string> = {
  AGUARDANDO_ORGANIZACAO: "bg-slate-100 text-slate-600",
  AGUARDANDO_AGENDAMENTO: "bg-amber-50 text-amber-700",
  ENTREGA_AGENDADA: "bg-blue-50 text-blue-700",
  REAGENDAMENTO_SOLICITADO: "bg-orange-50 text-orange-700",
  AGUARDANDO_ENTREGA: "bg-blue-50 text-blue-700",
  EM_PROCESSO_DE_ENTREGA: "bg-teal-50 text-teal-700",
  AGUARDANDO_CONFIRMACAO_COMPRADOR: "bg-amber-50 text-amber-700",
  ENTREGA_CONFIRMADA: "bg-emerald-50 text-emerald-700",
  DIVERGENCIA_NA_ENTREGA: "bg-red-50 text-red-700",
  ENTREGA_CANCELADA: "bg-slate-100 text-slate-600",
  NAO_COMPARECIMENTO_VENDEDOR: "bg-red-50 text-red-700",
  NAO_COMPARECIMENTO_COMPRADOR: "bg-red-50 text-red-700",
  LIBERADO_PARA_REPASSE: "bg-emerald-50 text-emerald-700",
};

export function StatusEntrega({ status }: { status: string }) {
  return <Badge className={CLASSE[status] || "bg-slate-100 text-slate-600"}>{ROTULO_ENTREGA[status] || status}</Badge>;
}

export const ITENS_CHECKLIST = [
  { chave: "veiculo", rotulo: "Veículo entregue", obrigatorio: true },
  { chave: "chave_principal", rotulo: "Chave principal", obrigatorio: true },
  { chave: "chave_reserva", rotulo: "Chave reserva, quando existente" },
  { chave: "manual", rotulo: "Manual, quando existente" },
  { chave: "documentacao", rotulo: "CRLV-e / documentação necessária", obrigatorio: true },
  { chave: "estepe", rotulo: "Estepe" },
  { chave: "acessorios", rotulo: "Itens/acessórios registrados" },
];

export const MOTIVOS_DIVERGENCIA = [
  "Veículo diferente do esperado",
  "Avaria não registrada",
  "Item ausente",
  "Documentação",
  "Quilometragem",
  "Problema na entrega",
  "Outro",
];
