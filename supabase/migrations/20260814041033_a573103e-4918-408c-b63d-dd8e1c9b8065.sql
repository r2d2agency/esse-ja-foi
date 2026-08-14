
-- profiles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO anon;

-- veiculos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculos TO authenticated;
GRANT ALL ON public.veiculos TO service_role;
GRANT SELECT ON public.veiculos TO anon;

-- agendamentos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
GRANT SELECT ON public.agendamentos TO anon;

-- clientes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
GRANT SELECT ON public.clientes TO anon;

-- laudos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laudos TO authenticated;
GRANT ALL ON public.laudos TO service_role;
GRANT SELECT ON public.laudos TO anon;

-- laudo_respostas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laudo_respostas TO authenticated;
GRANT ALL ON public.laudo_respostas TO service_role;
GRANT SELECT ON public.laudo_respostas TO anon;

-- laudo_fotos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laudo_fotos TO authenticated;
GRANT ALL ON public.laudo_fotos TO service_role;
GRANT SELECT ON public.laudo_fotos TO anon;

-- configuracoes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
GRANT SELECT ON public.configuracoes TO anon;

-- configuracoes_sistema
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    chave text PRIMARY KEY,
    valor text NOT NULL,
    descricao text,
    atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_sistema TO authenticated;
GRANT ALL ON public.configuracoes_sistema TO service_role;
GRANT SELECT ON public.configuracoes_sistema TO anon;

-- logs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;
GRANT SELECT ON public.logs TO anon;

-- parceiros_vistoria
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parceiros_vistoria TO authenticated;
GRANT ALL ON public.parceiros_vistoria TO service_role;
GRANT SELECT ON public.parceiros_vistoria TO anon;

-- checklist_modelos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_modelos TO authenticated;
GRANT ALL ON public.checklist_modelos TO service_role;
GRANT SELECT ON public.checklist_modelos TO anon;

-- checklist_itens
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_itens TO authenticated;
GRANT ALL ON public.checklist_itens TO service_role;
GRANT SELECT ON public.checklist_itens TO anon;

-- acessorios_catalogo
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessorios_catalogo TO authenticated;
GRANT ALL ON public.acessorios_catalogo TO service_role;
GRANT SELECT ON public.acessorios_catalogo TO anon;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudo_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laudo_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessorios_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Basic policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can read profiles' AND polrelid = 'public.profiles'::regclass) THEN
        CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can read veiculos' AND polrelid = 'public.veiculos'::regclass) THEN
        CREATE POLICY "Authenticated users can read veiculos" ON public.veiculos FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can read logs' AND polrelid = 'public.logs'::regclass) THEN
        CREATE POLICY "Authenticated users can read logs" ON public.logs FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can insert logs' AND polrelid = 'public.logs'::regclass) THEN
        CREATE POLICY "Authenticated users can insert logs" ON public.logs FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Authenticated users can read configuracoes_sistema' AND polrelid = 'public.configuracoes_sistema'::regclass) THEN
        CREATE POLICY "Authenticated users can read configuracoes_sistema" ON public.configuracoes_sistema FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
