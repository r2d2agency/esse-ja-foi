/**
 * Camada de integração desacoplada com o provedor financeiro.
 * Nenhuma lógica específica de provedor deve vazar para fora deste arquivo.
 */
export interface CobrancaProvider {
  id: string;
  criarCobranca(input: { valor: number; referencia: string; descricao: string; expiraEm: Date }): Promise<{
    id_externo: string;
    qr_code: string;
    copia_e_cola: string;
    expira_em: string;
    status: string;
  }>;
  consultarCobranca(idExterno: string): Promise<{ status: string; valor_pago?: number; pago_em?: string | null }>;
  cancelarCobranca(idExterno: string): Promise<{ ok: boolean }>;
  validarWebhook(payload: string, assinatura: string | null): boolean;
}

/** Payload EMV simplificado (Pix Copia e Cola) para o provedor interno de homologação. */
function montarCopiaECola(ref: string, valor: number) {
  const chave = process.env["PIX_CHAVE"] || "pagamentos@essejafoi.com.br";
  const v = valor.toFixed(2);
  return `00020126580014BR.GOV.BCB.PIX0136${chave}5204000053039865406${v}5802BR5913ESSE JA FOI6009SAO PAULO62${String(ref.length + 4).padStart(2, "0")}05${String(ref.length).padStart(2, "0")}${ref}6304EJF1`;
}

/** Provedor de homologação: usado enquanto credenciais reais não estão configuradas. */
const provedorInterno: CobrancaProvider = {
  id: "interno-homologacao",
  async criarCobranca({ valor, referencia, expiraEm }) {
    const idExterno = `PIX-${referencia}-${Date.now().toString(36).toUpperCase()}`;
    const copia = montarCopiaECola(referencia, valor);
    return {
      id_externo: idExterno,
      qr_code: copia,
      copia_e_cola: copia,
      expira_em: expiraEm.toISOString(),
      status: "AGUARDANDO",
    };
  },
  async consultarCobranca() {
    // Sem confirmação do provedor real: mantém aguardando (nunca confirma sozinho).
    return { status: "AGUARDANDO" };
  },
  async cancelarCobranca() {
    return { ok: true };
  },
  validarWebhook(payload, assinatura) {
    const segredo = process.env["PIX_WEBHOOK_SECRET"];
    if (!segredo) return false;
    if (!assinatura) return false;
    // Comparação de tamanho constante simples (sem dependência de node:crypto no worker).
    if (assinatura.length !== segredo.length) return false;
    let diff = 0;
    for (let i = 0; i < segredo.length; i++) diff |= assinatura.charCodeAt(i) ^ segredo.charCodeAt(i);
    return diff === 0 && payload.length > 0;
  },
};

export function getProvider(): CobrancaProvider {
  // Ponto único de troca de provedor no futuro.
  return provedorInterno;
}
