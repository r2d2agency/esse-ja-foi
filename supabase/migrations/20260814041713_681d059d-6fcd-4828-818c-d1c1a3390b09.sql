DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'operacao', 'vistoriador', 'comprador', 'vendedor');
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
  )
$$;

CREATE TABLE IF NOT EXISTS public.depreciacao_regras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid,
    resposta text,
    tipo_desconto text NOT NULL DEFAULT 'PERCENTUAL',
    valor numeric(14,2) NOT NULL DEFAULT 0,
    fator_leve numeric(14,2) DEFAULT 0.6,
    fator_media numeric(14,2) DEFAULT 1.0,
    fator_grave numeric(14,2) DEFAULT 1.8,
    ativo boolean NOT NULL DEFAULT true,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.depreciacao_calculos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    laudo_id uuid,
    veiculo_id uuid,
    usuario_id uuid,
    valor_fipe numeric(14,2),
    valor_final numeric(14,2),
    detalhamento jsonb,
    fora_da_curva boolean DEFAULT false,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL PRIVILEGES ON TABLE public.depreciacao_regras TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.depreciacao_regras TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.depreciacao_calculos TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.depreciacao_calculos TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER TABLE public.depreciacao_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciacao_calculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage depreciation rules" ON public.depreciacao_regras;
CREATE POLICY "Admins can manage depreciation rules"
ON public.depreciacao_regras
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Public read for depreciation rules" ON public.depreciacao_regras;
CREATE POLICY "Public read for depreciation rules"
ON public.depreciacao_regras
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage depreciation calculations" ON public.depreciacao_calculos;
CREATE POLICY "Authenticated users can manage depreciation calculations"
ON public.depreciacao_calculos
FOR ALL
TO authenticated
USING (true);
