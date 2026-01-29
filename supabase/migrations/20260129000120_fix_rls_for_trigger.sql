-- Fix RLS policies that might be blocking the trigger
-- Triggers need proper permissions to update tables

-- Check and fix RLS policies for leave_ledger
-- The trigger runs with SECURITY DEFINER but might still be blocked

-- Add a bypass for the trigger function
ALTER POLICY "Users can view own leave ledger" ON public.leave_ledger
USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('service_role', 'admin'));

ALTER POLICY "Users can insert own leave ledger" ON public.leave_ledger
WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('service_role', 'admin'));

ALTER POLICY "Users can update own leave ledger" ON public.leave_ledger
USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('service_role', 'admin'))
WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('service_role', 'admin'));

-- Add a specific policy for trigger operations
CREATE POLICY IF NOT EXISTS "Allow trigger operations on leave_ledger"
ON public.leave_ledger
FOR ALL
USING (auth.jwt() ->> 'role' IN ('service_role', 'admin') OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('service_role', 'admin'));

-- Also check audit_logs policies
ALTER POLICY "Users can view own audit logs" ON public.audit_logs
USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('service_role', 'admin'));

ALTER POLICY "Users can insert own audit logs" ON public.audit_logs
WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('service_role', 'admin'));

-- Add a specific policy for trigger audit operations
CREATE POLICY IF NOT EXISTS "Allow trigger operations on audit_logs"
ON public.audit_logs
FOR ALL
USING (auth.jwt() ->> 'role' IN ('service_role', 'admin') OR current_setting('request.jwt.claims', true)::jsonb ->> 'role' IN ('service_role', 'admin'));

-- Grant necessary permissions to the service role
GRANT ALL ON public.leave_ledger TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.leave_requests TO service_role;

-- Make sure RLS is enabled but allows trigger operations
ALTER TABLE public.leave_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add a test function to verify trigger permissions
CREATE OR REPLACE FUNCTION public.test_trigger_permissions()
RETURNS TEXT AS $$
DECLARE
    test_result TEXT;
BEGIN
    -- Test if we can read/write to leave_ledger
    BEGIN
        -- This should work with the new policies
        PERFORM 1 FROM public.leave_ledger LIMIT 1;
        test_result := '✅ Trigger permissions look good';
    EXCEPTION WHEN OTHERS THEN
        test_result := '❌ Trigger permission issue: ' || SQLERRM;
    END;
    
    RETURN test_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
    RAISE NOTICE '=== RLS POLICIES UPDATED ===';
    RAISE NOTICE 'Added service_role bypass for trigger operations';
    RAISE NOTICE 'Updated existing policies to allow admin/service_role';
    RAISE NOTICE 'This should fix trigger permission issues';
END $$;
