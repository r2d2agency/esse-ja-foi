import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do provedor financeiro.
 * A autenticidade é validada pela camada de integração antes de qualquer escrita.
 */
export const Route = createFileRoute("/api/public/webhooks/pagamentos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const assinatura = request.headers.get("x-pix-signature");

        const { getProvider } = await import("@/db/provedores/pix.server");
        if (!getProvider().validarWebhook(body, assinatura)) {
          return new Response("Assinatura inválida", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Payload inválido", { status: 400 });
        }

        const eventoId = payload?.evento_id ?? payload?.id;
        const idExterno = payload?.cobranca_id ?? payload?.txid;
        if (!eventoId || !idExterno) return new Response("Campos obrigatórios ausentes", { status: 400 });

        const { ensurePagamentosSchema, registrarEventoPagamento } = await import("@/db/pagamentos.server");
        await ensurePagamentosSchema();
        const resultado = await registrarEventoPagamento({
          evento_externo_id: String(eventoId),
          id_externo: String(idExterno),
          tipo: String(payload?.tipo || "PAGAMENTO_CONFIRMADO"),
          valor: payload?.valor != null ? Number(payload.valor) : undefined,
          payload,
        });

        return new Response(JSON.stringify(resultado), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  },
});
