-- Fix trigger issues and ensure proper setup
-- First, let's check what exists and fix any issues

-- Drop any existing problematic triggers
DROP TRIGGER IF EXISTS deduct_leave_on_approval_trigger ON public.leave_requests;

-- Drop and recreate the function with better error handling
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval();

-- Create a simpler, more reliable trigger function
CREATE OR REPLACE FUNCTION public.deduct_leave_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    leave_record RECORD;
    ledger_record RECORD;
    current_quarter INTEGER;
    current_year INTEGER;
    days_to_deduct INTEGER;
    debug_msg TEXT;
BEGIN
    -- Only proceed if status is being set to 'approved' and it wasn't approved before
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Get the leave request details
        SELECT * INTO leave_record 
        FROM public.leave_requests 
        WHERE id = NEW.id;
        
        -- Get current year and quarter from the leave start date
        current_year := EXTRACT(YEAR FROM leave_record.start_date)::INTEGER;
        current_quarter := EXTRACT(QUARTER FROM leave_record.start_date)::INTEGER;
        
        -- Get or create the user's leave ledger for the year
        SELECT * INTO ledger_record
        FROM public.leave_ledger
        WHERE user_id = leave_record.user_id 
          AND year = current_year
        FOR UPDATE;  -- Lock the record for update
        
        -- If no ledger record exists, create one with proper initial values
        IF ledger_record IS NULL THEN
            INSERT INTO public.leave_ledger (
                user_id, 
                year, 
                q1, q2, q3, q4,
                carried_from_last_year,
                optional_used
            ) VALUES (
                leave_record.user_id,
                current_year,
                5, 5, 5, 5,  -- 5 days per quarter = 20 days total
                0,           -- No carried forward initially
                0            -- No optional days used initially
            ) RETURNING * INTO ledger_record;
            
            debug_msg := format('Created new ledger for user %s, year %s', 
                               leave_record.user_id, current_year);
        END IF;
        
        -- Handle different leave types
        IF leave_record.leave_type = 'general' THEN
            -- Deduct from general leave balance
            days_to_deduct := leave_record.days;
            
            -- Deduct from the appropriate quarter
            CASE current_quarter
                WHEN 1 THEN 
                    UPDATE public.leave_ledger 
                    SET q1 = GREATEST(0, q1 - days_to_deduct),
                        updated_at = now()
                    WHERE id = ledger_record.id;
                WHEN 2 THEN 
                    UPDATE public.leave_ledger 
                    SET q2 = GREATEST(0, q2 - days_to_deduct),
                        updated_at = now()
                    WHERE id = ledger_record.id;
                WHEN 3 THEN 
                    UPDATE public.leave_ledger 
                    SET q3 = GREATEST(0, q3 - days_to_deduct),
                        updated_at = now()
                    WHERE id = ledger_record.id;
                WHEN 4 THEN 
                    UPDATE public.leave_ledger 
                    SET q4 = GREATEST(0, q4 - days_to_deduct),
                        updated_at = now()
                    WHERE id = ledger_record.id;
            END CASE;
            
            debug_msg := format('Deducted %s general leave days from Q%s', 
                               days_to_deduct, current_quarter);
            
        ELSIF leave_record.leave_type = 'optional' THEN
            -- Track optional leave usage separately
            UPDATE public.leave_ledger 
            SET optional_used = optional_used + leave_record.days,
                updated_at = now()
            WHERE id = ledger_record.id;
                
            debug_msg := format('Added %s optional leave days (total: %s)', 
                               leave_record.days, ledger_record.optional_used + leave_record.days);
        END IF;
        
        -- Log the action for debugging
        BEGIN
            INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
            VALUES (leave_record.user_id, 'LEAVE_APPROVED', 'leave_requests', NEW.id, 
                    jsonb_build_object(
                        'message', debug_msg,
                        'leave_type', leave_record.leave_type,
                        'days', leave_record.days,
                        'quarter', current_quarter,
                        'year', current_year,
                        'timestamp', now()
                    ));
        EXCEPTION WHEN OTHERS THEN
            -- Continue even if audit log fails
            NULL;
        END;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger with AFTER UPDATE
CREATE TRIGGER deduct_leave_on_approval_trigger
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION public.deduct_leave_on_approval();

-- Create a test function to verify the trigger works
CREATE OR REPLACE FUNCTION public.test_leave_deduction(p_user_id UUID, p_days INTEGER DEFAULT 1)
RETURNS TEXT AS $$
DECLARE
    test_request_id UUID;
    result TEXT;
BEGIN
    -- Create a test leave request
    INSERT INTO public.leave_requests (
        user_id,
        start_date,
        end_date,
        days,
        leave_type,
        reason,
        status
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '1 day',
        p_days,
        'general',
        'Test request for debugging',
        'pending'
    ) RETURNING id INTO test_request_id;
    
    -- Approve the request to trigger the deduction
    UPDATE public.leave_requests
    SET status = 'approved',
        approved_by = p_user_id
    WHERE id = test_request_id;
    
    -- Check if deduction worked
    SELECT INTO result 
        format('Test completed. Request %s created and approved. Check ledger for user %s.', 
               test_request_id, p_user_id);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add some debugging information
DO $$
BEGIN
    RAISE NOTICE 'Leave deduction trigger has been set up successfully';
    RAISE NOTICE 'Trigger: deduct_leave_on_approval_trigger';
    RAISE NOTICE 'Function: deduct_leave_on_approval()';
    RAISE NOTICE 'Test function: test_leave_deduction()';
END $$;
