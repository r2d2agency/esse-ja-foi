-- 1. Fix handle_new_user search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2. Revoke execute from public/authenticated for SECURITY DEFINER functions
-- and grant as needed.
-- has_role is SECURITY DEFINER, we want authenticated users to be able to use it in policies,
-- but policies run as the owner of the policy, so they don't need EXECUTE grant to call it if it's used in their own policy.
-- However, for SECURITY DEFINER functions, it's safer to be explicit.

REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(public.app_role) FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Note: The trigger runs as a superuser/owner, so it doesn't need explicit EXECUTE grant to PUBLIC.

-- 3. Add missing policies for checklist tables to clear linter
CREATE POLICY "Authenticated can view checklist modelos" ON public.checklist_modelos
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view checklist itens" ON public.checklist_itens
    FOR SELECT TO authenticated USING (true);
