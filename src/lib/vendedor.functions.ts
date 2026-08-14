import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashPassword } from "@/db/auth.server";
import { sql } from "drizzle-orm";
import { RegraNegocioError } from "@/db/cadastro.server";

const vendedorSchema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  whatsapp: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().optional().nullable(),
});

export const cadastrarVendedorFn = createServerFn({ method: "POST" })
  .inputValidator(vendedorSchema)
  .handler(async ({ data }) => {
    const { db: database } = await import("@/db/index");
    if (!database) throw new Error(`Banco de dados indisponível (Verifique se a DATABASE_URL está configurada corretamente)`);
    const db = database;
    
    const { ensureCadastroSchema } = await import("@/db/cadastro.server");
    await ensureCadastroSchema();
    
    const senhaHash = await hashPassword(data.password);
    
    try {
      // Primeiro garante o superadmin e a estrutura básica de auth (inclusive o enum)
      const { ensureSuperAdmin } = await import("@/db/auth.server");
      await ensureSuperAdmin();

      const rows = await db.execute(sql`
        INSERT INTO profiles (nome, email, role, senha_hash, whatsapp, cpf, cep, endereco, cidade, uf, ativo, protegido)
        VALUES (${data.nome}, ${data.email.toLowerCase()}, 'vendedor'::app_role, ${senhaHash}, ${data.whatsapp ?? null}, ${data.cpf ?? null}, ${data.cep ?? null}, ${data.endereco ?? null}, ${data.cidade ?? null}, ${data.uf ?? null}, true, false)
        RETURNING id, nome, email, role;
      `);
      const user = (rows as any).rows?.[0] || (rows as any)[0];
      
      const { issueToken } = await import("@/db/auth.server");
      const accessToken = await issueToken(user.id);
      
      return { ok: true as const, user, accessToken };
    } catch (error: any) {
      console.error("Erro ao cadastrar vendedor:", error);
      if (error.message?.includes("unique constraint") || error.message?.includes("already exists") || error.code === '23505') {
        return { ok: false as const, message: "Este e-mail já está cadastrado." };
      }
      
      // Sanitiza a mensagem de erro para o usuário não ver a query SQL bruta em caso de falha genérica
      let userMessage = "Erro no servidor ao processar o cadastro.";
      if (error.message?.includes("app_role")) {
        userMessage = "Erro na configuração de permissões do sistema. Contate o suporte. ao tentar fazer um cadastro como vendedor";
      }
      
      return { ok: false as const, message: userMessage };
    }
  });

export const listarMeusVeiculosFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ perfilId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db: database } = await import("@/db/index");
    if (!database) throw new Error("Banco de dados indisponível");
    const db = database;
    const rows = await db.execute(sql`
      SELECT * FROM veiculos 
      WHERE perfil_id = ${data.perfilId}::uuid 
      ORDER BY criado_em DESC;
    `);
    
    const profileRows = await db.execute(sql`
      SELECT cadastro_completo FROM profiles WHERE id = ${data.perfilId}::uuid;
    `);
    
    return { 
      ok: true as const, 
      data: (rows as any).rows || rows,
      profile: (profileRows as any).rows?.[0] || (profileRows as any)[0]
    };
  });

export const cadastrarMeuVeiculoFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    perfilId: z.string().uuid(),
    placa: z.string().min(7),
    marca: z.string().min(2),
    modelo: z.string().min(2),
    anoFabricacao: z.string().optional(),
    anoModelo: z.string().optional(),
    km: z.number().optional(),
    valorInteresse: z.number().optional(),
    opcionais: z.array(z.string()).optional(),
    observacoes: z.string().optional(),
    fotos: z.array(z.string()).optional(),
    endereco: z.string().optional(),
    cep: z.string().optional(),
    cidade: z.string().optional(),
    uf: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    complemento: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { salvarVeiculo } = await import("@/db/cadastro.server");
    return await salvarVeiculo({
      ...data,
      valorInteresseCliente: data.valorInteresse,
      status: 'AGUARDANDO_APROVACAO',
      observacoes: `Opcionais: ${(data.opcionais || []).join(', ')}. ${data.observacoes || ''}`
    } as any);
  });

export const atualizarDocumentosVendedorFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    data: z.object({
      perfilId: z.string().uuid(),
      cpf: z.string().optional(),
      cep: z.string().optional(),
      endereco: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cnhUrl: z.string().optional(),
      crlvUrl: z.string().optional(),
      selfieUrl: z.string().optional(),
      finalizar: z.boolean().optional(),
    })
  }).parse(d))
  .handler(async ({ data: { data } }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");
    
    await db.execute(sql`
      UPDATE profiles 
      SET 
        cpf = COALESCE(${data.cpf ?? null}, cpf),
        cep = COALESCE(${data.cep ?? null}, cep),
        endereco = COALESCE(${data.endereco ?? null}, endereco),
        cidade = COALESCE(${data.cidade ?? null}, cidade),
        uf = COALESCE(${data.uf ?? null}, uf),
        documento_cnh_url = COALESCE(${data.cnhUrl ?? null}, documento_cnh_url),
        documento_crlv_url = COALESCE(${data.crlvUrl ?? null}, documento_crlv_url),
        documento_selfie_url = COALESCE(${data.selfieUrl ?? null}, documento_selfie_url),
        cadastro_completo = CASE WHEN ${data.finalizar ?? false} THEN true ELSE cadastro_completo END
      WHERE id = ${data.perfilId}::uuid;
    `);
    
    return { ok: true as const };
  });
