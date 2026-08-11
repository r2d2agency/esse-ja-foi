-- 1. Create App Role Enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operacao', 'vistoriador', 'comprador');

-- 2. Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT UNIQUE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'comprador',
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. Function has_role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = _role
  )
$$;

-- 4. Leads Table
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    cidade TEXT,
    marca TEXT,
    modelo TEXT,
    ano INTEGER,
    mensagem TEXT,
    origem TEXT,
    campanha TEXT,
    status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'qualificado', 'convertido', 'perdido')),
    responsavel_id UUID REFERENCES public.profiles(id),
    tentativas_contato INTEGER NOT NULL DEFAULT 0,
    convertido_cliente_id UUID, -- Will be filled when converted
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations can access all leads" ON public.leads
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));

-- 5. Clientes Table
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('pf', 'pj')),
    nome TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE NOT NULL,
    telefone TEXT,
    whatsapp TEXT,
    email TEXT UNIQUE,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf CHAR(2),
    autoriza_contato BOOLEAN NOT NULL DEFAULT true,
    lead_origem_id UUID REFERENCES public.leads(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations can access all clientes" ON public.clientes
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));

-- 6. Veiculos Table
CREATE TABLE public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    placa TEXT UNIQUE NOT NULL,
    renavam TEXT UNIQUE NOT NULL,
    chassi_parcial TEXT,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    versao TEXT,
    ano_fabricacao INTEGER NOT NULL,
    ano_modelo INTEGER NOT NULL,
    km INTEGER,
    cor TEXT,
    cambio TEXT,
    combustivel TEXT,
    cep_local TEXT,
    endereco_local TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    valor_fipe NUMERIC(15,2),
    valor_interesse_cliente NUMERIC(15,2),
    tipo_expectativa TEXT,
    status TEXT NOT NULL DEFAULT 'cadastrado' CHECK (status IN ('cadastrado', 'agendado', 'em_vistoria', 'em_avaliacao', 'aprovado', 'em_leilao', 'encerrado', 'vendido', 'recusado')),
    criado_por UUID REFERENCES public.profiles(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
GRANT SELECT ON public.veiculos TO anon; -- Public view for vitrine
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations can all veiculos" ON public.veiculos
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));
CREATE POLICY "Anyone can view vehicles in leilao" ON public.veiculos
    FOR SELECT TO public USING (status = 'em_leilao');

-- 7. Parceiros Vistoria
CREATE TABLE public.parceiros_vistoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    contato TEXT,
    cidade TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.parceiros_vistoria TO authenticated;
GRANT ALL ON public.parceiros_vistoria TO service_role;
ALTER TABLE public.parceiros_vistoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations can all parceiros" ON public.parceiros_vistoria
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));

-- 8. Agendamentos
CREATE TABLE public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
    parceiro_id UUID REFERENCES public.parceiros_vistoria(id),
    vistoriador_id UUID REFERENCES public.profiles(id),
    unidade_local TEXT,
    endereco_vistoria TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    observacao TEXT,
    responsavel_interno_id UUID REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'realizado', 'cancelado')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vistoriadores view their own" ON public.agendamentos
    FOR SELECT TO authenticated USING (vistoriador_id = auth.uid() OR public.has_role('admin') OR public.has_role('operacao'));

-- 9. Checklist Modelos e Itens
CREATE TABLE public.checklist_modelos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    versao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.checklist_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo_id UUID REFERENCES public.checklist_modelos(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    titulo TEXT NOT NULL,
    tipo_resposta TEXT NOT NULL CHECK (tipo_resposta IN ('ok_avaria', 'opcoes', 'numero', 'texto')),
    opcoes JSONB,
    foto_obrigatoria BOOLEAN NOT NULL DEFAULT false,
    ordem INTEGER NOT NULL DEFAULT 0,
    peso_depreciacao_id UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.checklist_modelos TO authenticated;
GRANT ALL ON public.checklist_modelos TO service_role;
GRANT SELECT ON public.checklist_itens TO authenticated;
GRANT ALL ON public.checklist_itens TO service_role;
ALTER TABLE public.checklist_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;

-- 10. Laudos, Respostas e Fotos
CREATE TABLE public.laudos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES public.agendamentos(id),
    vistoriador_id UUID REFERENCES public.profiles(id),
    protocolo TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado', 'devolvido', 'aprovado')),
    enviado_em TIMESTAMPTZ,
    bloqueado BOOLEAN NOT NULL DEFAULT false,
    observacoes_gerais TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.laudo_respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laudo_id UUID REFERENCES public.laudos(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.checklist_itens(id),
    resposta TEXT,
    opcao_escolhida TEXT,
    valor_numero NUMERIC,
    observacao TEXT,
    tem_avaria BOOLEAN NOT NULL DEFAULT false,
    gravidade TEXT CHECK (gravidade IN ('leve', 'media', 'grave')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.laudo_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    laudo_id UUID REFERENCES public.laudos(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.checklist_itens(id),
    categoria_foto TEXT,
    url TEXT NOT NULL,
    obrigatoria BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.laudos TO authenticated;
GRANT ALL ON public.laudos TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.laudo_respostas TO authenticated;
GRANT ALL ON public.laudo_respostas TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.laudo_fotos TO authenticated;
GRANT ALL ON public.laudo_fotos TO service_role;

ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudo_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudo_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vistoriadores manage their own laudos" ON public.laudos
    FOR ALL TO authenticated USING (vistoriador_id = auth.uid() OR public.has_role('admin') OR public.has_role('operacao'));
CREATE POLICY "Vistoriadores manage their own respostas" ON public.laudo_respostas
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.laudos WHERE id = laudo_id AND (vistoriador_id = auth.uid() OR public.has_role('admin') OR public.has_role('operacao'))));
CREATE POLICY "Vistoriadores manage their own fotos" ON public.laudo_fotos
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.laudos WHERE id = laudo_id AND (vistoriador_id = auth.uid() OR public.has_role('admin') OR public.has_role('operacao'))));

-- 11. Anuncios e Leiloes
CREATE TABLE public.anuncios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    destaques JSONB,
    foto_capa_id UUID,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'aprovado', 'publicado', 'encerrado')),
    aprovado_por UUID REFERENCES public.profiles(id),
    aprovado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.leiloes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE CASCADE,
    anuncio_id UUID REFERENCES public.anuncios(id) ON DELETE CASCADE,
    inicio_em TIMESTAMPTZ NOT NULL,
    fim_em TIMESTAMPTZ NOT NULL,
    lance_inicial NUMERIC(15,2) NOT NULL,
    incremento_minimo NUMERIC(15,2) NOT NULL DEFAULT 100,
    prorrogacao_ativa BOOLEAN NOT NULL DEFAULT true,
    prorrogacao_minutos INTEGER NOT NULL DEFAULT 2,
    gatilho_prorrogacao_minutos INTEGER NOT NULL DEFAULT 2,
    timeout_arremate_horas INTEGER NOT NULL DEFAULT 24,
    status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'aberto', 'encerrado', 'cancelado', 'deserto')),
    vencedor_lance_id UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.anuncios TO public;
GRANT ALL ON public.anuncios TO service_role;
GRANT SELECT ON public.leiloes TO public;
GRANT ALL ON public.leiloes TO service_role;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leiloes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage anuncios" ON public.anuncios
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));
CREATE POLICY "Admins manage leiloes" ON public.leiloes
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));

-- 12. Lances e Verificacao Comprador
CREATE TABLE public.lances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leilao_id UUID REFERENCES public.leiloes(id) ON DELETE CASCADE,
    comprador_id UUID REFERENCES public.profiles(id),
    valor NUMERIC(15,2) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip TEXT,
    sessao TEXT,
    valido BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.compradores_verificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('pf', 'pj')),
    cpf_cnpj TEXT UNIQUE NOT NULL,
    razao_social TEXT,
    responsavel TEXT,
    documentos JSONB,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'correcao', 'bloqueado')),
    analisado_por UUID REFERENCES public.profiles(id),
    analisado_em TIMESTAMPTZ,
    motivo TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.lances TO authenticated;
GRANT ALL ON public.lances TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.compradores_verificacao TO authenticated;
GRANT ALL ON public.compradores_verificacao TO service_role;

ALTER TABLE public.lances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compradores_verificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Compradores view their own lances" ON public.lances
    FOR SELECT TO authenticated USING (comprador_id = auth.uid() OR public.has_role('admin') OR public.has_role('operacao'));
CREATE POLICY "Compradores insert lance if approved" ON public.lances
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.compradores_verificacao
            WHERE profile_id = auth.uid() AND status = 'aprovado'
        )
    );

CREATE POLICY "Compradores manage their own verificacao" ON public.compradores_verificacao
    FOR ALL TO authenticated USING (profile_id = auth.uid() OR public.has_role('admin') OR public.has_role('operacao'));

-- 13. Vendas
CREATE TABLE public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES public.veiculos(id),
    leilao_id UUID REFERENCES public.leiloes(id),
    comprador_id UUID REFERENCES public.profiles(id),
    valor_acertado NUMERIC(15,2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel_id UUID REFERENCES public.profiles(id),
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.vendas TO service_role;
GRANT SELECT ON public.vendas TO authenticated;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operations manage vendas" ON public.vendas
    FOR ALL TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));

-- 14. Configuracoes e Logs
CREATE TABLE public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    valor JSONB,
    descricao TEXT
);

CREATE TABLE public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id),
    entidade TEXT,
    entidade_id UUID,
    acao TEXT,
    dados_antes JSONB,
    dados_depois JSONB,
    ip TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.configuracoes TO service_role;
GRANT SELECT ON public.configuracoes TO authenticated;
GRANT ALL ON public.logs TO service_role;
GRANT SELECT ON public.logs TO authenticated;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only for configs" ON public.configuracoes
    FOR ALL TO authenticated USING (public.has_role('admin'));
CREATE POLICY "Admins and operations view logs" ON public.logs
    FOR SELECT TO authenticated USING (public.has_role('admin') OR public.has_role('operacao'));

-- 15. Trigger for auto-profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'nome', COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'comprador'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
