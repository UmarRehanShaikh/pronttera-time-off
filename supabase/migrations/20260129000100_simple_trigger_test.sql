-- Create a simple test to verify the trigger is working
-- This will help us debug the issue

-- First, let's create a simple test function
CREATE OR REPLACE FUNCTION public.simple_trigger_test()
RETURNS TEXT AS $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000';  -- This will be replaced
    test_request_id UUID;
    ledger_before RECORD;
    ledger_after RECORD;
    result TEXT;
BEGIN
    -- Get the current user ID (for testing)
    SELECT id INTO test_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RETURN 'No user found for testing';
    END IF;
    
    -- Check ledger before
    SELECT * INTO ledger_before
    FROM public.leave_ledger
    WHERE user_id = test_user_id 
      AND year = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Create a test request
    INSERT INTO public.leave_requests (
        user_id,
        start_date,
        end_date,
        days,
        leave_type,
        reason,
        status
    ) VALUES (
        test_user_id,
        CURRENT_DATE,
        CURRENT_DATE,
        1,
        'general',
        'Test for trigger debugging',
        'pending'
    ) RETURNING id INTO test_request_id;
    
    -- Approve the request (this should trigger the deduction)
    UPDATE public.leave_requests
    SET status = 'approved'
    WHERE id = test_request_id;
    
    -- Wait a moment for the trigger to execute
    PERFORM pg_sleep(0.1);
    
    -- Check ledger after
    SELECT * INTO ledger_after
    FROM public.leave_ledger
    WHERE user_id = test_user_id 
      AND year = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Compare results
    IF ledger_before IS NULL AND ledger_after IS NOT NULL THEN
        result := '✅ Trigger worked: Ledger was created';
    ELSIF ledger_before IS NOT NULL AND ledger_after IS NOT NULL THEN
        IF ledger_before.q1 + ledger_before.q2 + ledger_before.q3 + ledger_before.q4 > 
           ledger_after.q1 + ledger_after.q2 + ledger_after.q3 + ledger_after.q4 THEN
            result := '✅ Trigger worked: Leave was deducted';
        ELSE
            result := '❌ Trigger failed: No deduction detected';
        END IF;
    ELSE
        result := '❌ Trigger failed: Ledger issue';
    END IF;
    
    -- Clean up test data
    DELETE FROM public.leave_requests WHERE id = test_request_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also create a function to check trigger existence
CREATE OR REPLACE FUNCTION public.check_trigger_exists()
RETURNS TEXT AS $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_name = 'deduct_leave_on_approval_trigger'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RETURN '✅ Trigger exists in database';
    ELSE
        RETURN '❌ Trigger not found in database';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
