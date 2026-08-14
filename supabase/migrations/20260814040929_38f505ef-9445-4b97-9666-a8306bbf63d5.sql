
CREATE TABLE IF NOT EXISTS public.checklist_modelos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo text NOT NULL,
    nome text NOT NULL,
    descricao text,
    versao integer NOT NULL DEFAULT 1,
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_modelos TO authenticated;
GRANT ALL ON public.checklist_modelos TO service_role;
GRANT SELECT ON public.checklist_modelos TO anon;

CREATE TABLE IF NOT EXISTS public.checklist_itens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo_id uuid NOT NULL REFERENCES public.checklist_modelos(id) ON DELETE CASCADE,
    categoria text NOT NULL DEFAULT 'GERAL',
    titulo text NOT NULL,
    ajuda text,
    tipo text NOT NULL DEFAULT 'OK_AVARIA',
    obrigatorio boolean NOT NULL DEFAULT true,
    exige_foto boolean NOT NULL DEFAULT false,
    ordem integer NOT NULL DEFAULT 0,
    criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_itens TO authenticated;
GRANT ALL ON public.checklist_itens TO service_role;
GRANT SELECT ON public.checklist_itens TO anon;

CREATE TABLE IF NOT EXISTS public.acessorios_catalogo (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    categoria text,
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessorios_catalogo TO authenticated;
GRANT ALL ON public.acessorios_catalogo TO service_role;
GRANT SELECT ON public.acessorios_catalogo TO anon;

ALTER TABLE public.checklist_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessorios_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.checklist_modelos FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.checklist_itens FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.acessorios_catalogo FOR SELECT USING (true);
