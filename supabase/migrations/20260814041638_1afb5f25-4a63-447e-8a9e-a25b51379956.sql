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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.depreciacao_regras TO authenticated;
GRANT ALL ON public.depreciacao_regras TO service_role;

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.depreciacao_calculos TO authenticated;
GRANT ALL ON public.depreciacao_calculos TO service_role;

-- Grant missing permissions to existing tables as well
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
