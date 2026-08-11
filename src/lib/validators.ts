/** Validações de documentos e placas — usadas no cliente e no servidor. */

export function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

export function isValidCPF(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 || rest === 11 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidCNPJ(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * (weights[i] as number);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function isValidDocumento(value: string) {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

export function tipoPessoa(value: string): "PF" | "PJ" | null {
  const d = onlyDigits(value);
  if (d.length === 11) return "PF";
  if (d.length === 14) return "PJ";
  return null;
}

export function formatDocumento(value: string) {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}

const PLACA_ANTIGA = /^[A-Z]{3}[0-9]{4}$/;
const PLACA_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizePlaca(value: string) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlaca(value: string) {
  const p = normalizePlaca(value);
  return PLACA_ANTIGA.test(p) || PLACA_MERCOSUL.test(p);
}

export function formatPlaca(value: string) {
  const p = normalizePlaca(value);
  if (PLACA_ANTIGA.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}

/** Máquina de estados do veículo. */
export const VEICULO_STATUS = [
  "CADASTRADO",
  "AGENDADO",
  "EM_VISTORIA",
  "EM_AVALIACAO",
  "APROVADO",
  "EM_LEILAO",
  "ENCERRADO",
  "VENDIDO",
  "RECUSADO",
] as const;

export type VeiculoStatus = (typeof VEICULO_STATUS)[number];

export const TRANSICOES: Record<VeiculoStatus, VeiculoStatus[]> = {
  CADASTRADO: ["AGENDADO", "RECUSADO"],
  AGENDADO: ["EM_VISTORIA", "RECUSADO"],
  EM_VISTORIA: ["EM_AVALIACAO", "RECUSADO"],
  EM_AVALIACAO: ["APROVADO", "RECUSADO"],
  APROVADO: ["EM_LEILAO", "RECUSADO"],
  EM_LEILAO: ["ENCERRADO", "RECUSADO"],
  ENCERRADO: ["VENDIDO", "RECUSADO"],
  VENDIDO: [],
  RECUSADO: [],
};

export function podeTransicionar(de: string, para: string) {
  const from = (de || "").toUpperCase() as VeiculoStatus;
  const to = (para || "").toUpperCase() as VeiculoStatus;
  if (!VEICULO_STATUS.includes(to)) return false;
  return (TRANSICOES[from] ?? []).includes(to);
}

export const TIPOS_EXPECTATIVA = ["FIPE", "ACIMA_FIPE", "ABAIXO_FIPE", "URGENTE"] as const;

export function calcPercentualSobreFipe(valorFipe: number, valorInteresse: number) {
  if (!valorFipe || valorFipe <= 0) return 0;
  return Number((((valorInteresse - valorFipe) / valorFipe) * 100).toFixed(2));
}