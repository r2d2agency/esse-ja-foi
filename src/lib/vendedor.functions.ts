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
  .validator(vendedorSchema)
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
        INSERT INTO profiles (nome, email, role, senha_hash, whatsapp, cpf, cep, endereco, cidade, uf, ativo, protegido, cadastro_completo)
        VALUES (
          ${data.nome}, 
          ${data.email.toLowerCase()}, 
          'vendedor'::text::app_role, 
          ${senhaHash}, 
          ${data.whatsapp ?? null}, 
          ${data.cpf ?? null}, 
          ${data.cep ?? null}, 
          ${data.endereco ?? null}, 
          ${data.cidade ?? null}, 
          ${data.uf ?? null}, 
          true, 
          false, 
          false
        )
        RETURNING id, nome, email, role;
      `);
      const user = (rows as any).rows?.[0] || (rows as any)[0];
      
      const { issueToken } = await import("@/db/auth.server");
      const accessToken = await issueToken(user.id);
      
      // Dispara OTP para confirmação de cadastro
      try {
        const { gerarEnviarOTP } = await import("@/db/mail.server");
        await gerarEnviarOTP(data.email.toLowerCase(), 'REGISTRATION');
      } catch (mailErr) {
        console.error("Erro ao enviar e-mail de boas-vindas/OTP:", mailErr);
      }

      return { ok: true as const, user, accessToken };

    } catch (error: any) {
      console.error("Erro detalhado ao cadastrar vendedor:", error);
      
      const { db: database } = await import("@/db/index");
      if (database) {
        try {
          const detail = {
            mensagem: error.message,
            codigo: error.code,
            hint: error.hint,
            stack: error.stack,
            context: { email: data.email, nome: data.nome }
          };
          
          await database.execute(sql`
            INSERT INTO logs (entidade, acao, detalhe, usuario)
            VALUES ('auth', 'CADASTRO_VENDEDOR_ERRO', ${JSON.stringify(detail)}, ${data.email})
          `);
        } catch (logErr) {
          console.error("Erro ao registrar log de erro:", logErr);
        }
      }

      if (error.message?.includes("unique constraint") || error.message?.includes("already exists") || error.code === '23505') {
        return { ok: false as const, message: "Este e-mail já está cadastrado." };
      }
      
      let userMessage = `Erro técnico: ${error.message || "Erro desconhecido"}`;
      if (error.message?.includes("app_role") || error.message?.includes("permission") || error.code === '42P01') {
        userMessage = `Erro de permissão ou estrutura de banco: ${error.message}. Use o Dashboard Admin para verificar a saúde do sistema.`;
      }
      
      return { ok: false as const, message: userMessage };
    }
  });

export const listarMeusVeiculosFn = createServerFn({ method: "GET" })
  .validator(z.object({ perfilId: z.string().uuid() }))
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
  .validator(z.object({
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
  .validator(z.object({
    perfilId: z.string().uuid(),
    cpf: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    endereco: z.string().optional().nullable(),
    numero: z.string().optional().nullable(),
    bairro: z.string().optional().nullable(),
    complemento: z.string().optional().nullable(),
    cidade: z.string().optional().nullable(),
    uf: z.string().optional().nullable(),
    cnhUrl: z.string().optional().nullable(),
    cnhVersoUrl: z.string().optional().nullable(),
    crlvUrl: z.string().optional().nullable(),
    selfieUrl: z.string().optional().nullable(),
    comprovanteEnderecoUrl: z.string().optional().nullable(),
    finalizar: z.boolean().optional(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    const { sql } = await import("drizzle-orm");
    if (!db) throw new Error("Banco de dados indisponível");

    if (data.finalizar) {
      const atual = (await db.execute(sql`
        SELECT documento_cnh_url, documento_cnh_verso_url, documento_crlv_url,
               documento_selfie_url, documento_comprovante_endereco_url
        FROM profiles WHERE id = ${data.perfilId}::uuid
      `)) as any;
      const p = atual.rows?.[0] || atual[0] || {};
      const faltando: string[] = [];
      if (!(data.cnhUrl || p.documento_cnh_url)) faltando.push("CNH (frente)");
      if (!(data.cnhVersoUrl || p.documento_cnh_verso_url)) faltando.push("CNH (verso)");
      if (!(data.crlvUrl || p.documento_crlv_url)) faltando.push("CRLV-e");
      if (!(data.comprovanteEnderecoUrl || p.documento_comprovante_endereco_url)) faltando.push("Comprovante de residência");
      if (!(data.selfieUrl || p.documento_selfie_url)) faltando.push("Selfie de validação");
      if (faltando.length) {
        throw new Error(`Envie todos os documentos para concluir: ${faltando.join(", ")}.`);
      }
    }

    await db.execute(sql`
      UPDATE profiles 
      SET 
        cpf = CASE WHEN ${data.cpf} IS NOT NULL THEN ${data.cpf}::text ELSE cpf END,
        cep = CASE WHEN ${data.cep} IS NOT NULL THEN ${data.cep}::text ELSE cep END,
        endereco = CASE WHEN ${data.endereco} IS NOT NULL THEN ${data.endereco}::text ELSE endereco END,
        numero = CASE WHEN ${data.numero} IS NOT NULL THEN ${data.numero}::text ELSE numero END,
        bairro = CASE WHEN ${data.bairro} IS NOT NULL THEN ${data.bairro}::text ELSE bairro END,
        complemento = CASE WHEN ${data.complemento} IS NOT NULL THEN ${data.complemento}::text ELSE complemento END,
        cidade = CASE WHEN ${data.cidade} IS NOT NULL THEN ${data.cidade}::text ELSE cidade END,
        uf = CASE WHEN ${data.uf} IS NOT NULL THEN ${data.uf}::text ELSE uf END,
        documento_cnh_url = CASE WHEN ${data.cnhUrl} IS NOT NULL THEN ${data.cnhUrl}::text ELSE documento_cnh_url END,
        documento_cnh_verso_url = CASE WHEN ${data.cnhVersoUrl} IS NOT NULL THEN ${data.cnhVersoUrl}::text ELSE documento_cnh_verso_url END,
        documento_crlv_url = CASE WHEN ${data.crlvUrl} IS NOT NULL THEN ${data.crlvUrl}::text ELSE documento_crlv_url END,
        documento_selfie_url = CASE WHEN ${data.selfieUrl} IS NOT NULL THEN ${data.selfieUrl}::text ELSE documento_selfie_url END,
        documento_comprovante_endereco_url = CASE WHEN ${data.comprovanteEnderecoUrl} IS NOT NULL THEN ${data.comprovanteEnderecoUrl}::text ELSE documento_comprovante_endereco_url END,
        cadastro_completo = CASE WHEN ${data.finalizar ?? false} = true THEN true ELSE cadastro_completo END
      WHERE id = ${data.perfilId}::uuid;
    `);
    
    return { ok: true as const };
  });


export const validarOTPCadastroFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), code: z.string() }))
  .handler(async ({ data }) => {
    const { validarOTP } = await import("@/db/mail.server");
    const ok = await validarOTP(data.email, data.code, 'REGISTRATION');
    return { ok };
  });

export const resenderOTPCadastroFn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const { gerarEnviarOTP } = await import("@/db/mail.server");
    try {
      await gerarEnviarOTP(data.email, 'REGISTRATION');
      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, message: e.message };
    }
  });

export const obterMeuPerfilFn = createServerFn({ method: "GET" })

  .validator(z.object({ perfilId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    if (!db) throw new Error("Banco de dados indisponível");
    const { ensureSuperAdmin } = await import("@/db/auth.server");
    await ensureSuperAdmin();
    const { ensurePerfilSchema } = await import("@/db/perfil.server");
    await ensurePerfilSchema();
    const rows = await db.execute(sql`
      SELECT id, nome, email, whatsapp, telefone, cpf, cep, endereco, cidade, uf, role,
             documento_cnh_url, documento_crlv_url, documento_selfie_url,
             cadastro_completo, criado_em
      FROM profiles WHERE id = ${data.perfilId}::uuid LIMIT 1;
    `);
    const perfil = (rows as any).rows?.[0] || (rows as any)[0] || null;
    return { ok: true as const, perfil };
  });

export const atualizarMeuPerfilFn = createServerFn({ method: "POST" })
  .validator(z.object({
    perfilId: z.string().uuid(),
    nome: z.string().min(3, "Nome muito curto"),
    whatsapp: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    endereco: z.string().optional().nullable(),
    cidade: z.string().optional().nullable(),
    uf: z.string().optional().nullable(),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    if (!db) throw new Error("Banco de dados indisponível");
    const { ensurePerfilSchema } = await import("@/db/perfil.server");
    await ensurePerfilSchema();
    const rows = await db.execute(sql`
      UPDATE profiles SET
        nome = ${data.nome},
        whatsapp = ${data.whatsapp ?? null},
        cpf = ${data.cpf ?? null},
        cep = ${data.cep ?? null},
        endereco = ${data.endereco ?? null},
        cidade = ${data.cidade ?? null},
        uf = ${data.uf ?? null},
        atualizado_em = now()
      WHERE id = ${data.perfilId}::uuid
      RETURNING id, nome, email, role, whatsapp, cpf;
    `);
    const perfil = (rows as any).rows?.[0] || (rows as any)[0] || null;
    if (!perfil) return { ok: false as const, message: "Perfil não encontrado." };
    return { ok: true as const, perfil };
  });

export const alterarMinhaSenhaFn = createServerFn({ method: "POST" })
  .validator(z.object({
    perfilId: z.string().uuid(),
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
  }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db/index");
    if (!db) throw new Error("Banco de dados indisponível");
    const { verifyPassword } = await import("@/db/auth.server");
    const rows = await db.execute(sql`SELECT senha_hash FROM profiles WHERE id = ${data.perfilId}::uuid LIMIT 1;`);
    const row = (rows as any).rows?.[0] || (rows as any)[0];
    if (!row?.senha_hash) return { ok: false as const, message: "Perfil sem senha cadastrada." };
    const confere = await verifyPassword(data.senhaAtual, row.senha_hash);
    if (!confere) return { ok: false as const, message: "Senha atual incorreta." };
    const novoHash = await hashPassword(data.novaSenha);
    await db.execute(sql`UPDATE profiles SET senha_hash = ${novoHash}, atualizado_em = now() WHERE id = ${data.perfilId}::uuid;`);
    return { ok: true as const };
  });
