import { createFileRoute } from '@tanstack/react-router';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export const Route = createFileRoute('/api/public/webhooks/whatsapp')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Validação do Webhook pela Meta (Verification Request)
        const url = new URL(request.url);
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && token) {
          // Buscar token configurado no banco
          if (!db) return new Response('DB offline', { status: 500 });
          const res = await db.execute(sql`SELECT webhook_verify_token FROM whatsapp_config LIMIT 1`);
          const config = (res as any).rows?.[0];

          if (config?.webhook_verify_token === token) {
            return new Response(challenge, { status: 200 });
          }
        }
        return new Response('Forbidden', { status: 403 });
      },
      POST: async ({ request }) => {
        // Recebimento de eventos (Status de Mensagens)
        const body = await request.json();
        
        // TODO: Validar assinatura x-hub-signature-256
        
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const statuses = value?.statuses;

        if (statuses && Array.isArray(statuses)) {
          for (const status of statuses) {
            const messageId = status.id;
            const statusType = status.status; // delivered, read, failed, sent
            const timestamp = status.timestamp;
            
            if (!db) continue;

            try {
              // Atualizar status da mensagem no banco
              const updateData: any = {
                status: statusType.toUpperCase() === 'DELIVERED' ? 'ENTREGUE' : 
                        statusType.toUpperCase() === 'READ' ? 'LIDA' : 
                        statusType.toUpperCase() === 'FAILED' ? 'FALHOU' : 'ENVIADA',
                atualizado_em: new Date()
              };

              if (statusType === 'delivered') updateData.entregue_em = new Date(parseInt(timestamp) * 1000);
              if (statusType === 'read') updateData.lido_em = new Date(parseInt(timestamp) * 1000);

              await db.execute(sql`
                UPDATE whatsapp_mensagens 
                SET 
                  status = ${updateData.status},
                  entregue_em = COALESCE(${updateData.entregue_em || null}, entregue_em),
                  lido_em = COALESCE(${updateData.lido_em || null}, lido_em),
                  atualizado_em = now()
                WHERE meta_message_id = ${messageId}
              `);

              // TODO: Atualizar contadores da campanha de forma atômica ou via trigger
            } catch (e) {
              console.error('Erro ao processar webhook whatsapp:', e);
            }
          }
        }

        return new Response('OK', { status: 200 });
      }
    }
  }
});
