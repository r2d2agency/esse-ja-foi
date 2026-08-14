
-- Grant explicit permissions on depreciation tables to relevant roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depreciacao_regras TO authenticated;
GRANT ALL ON public.depreciacao_regras TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.depreciacao_calculos TO authenticated;
GRANT ALL ON public.depreciacao_calculos TO service_role;

-- Ensure sequences (if any) are also accessible for inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
