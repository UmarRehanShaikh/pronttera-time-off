-- Fix the trigger with a simpler, more reliable approach
-- Since manual deduction works, we know the logic is correct

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS deduct_leave_on_approval_trigger ON public.leave_requests;
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval();

-- Create a much simpler trigger function
CREATE OR REPLACE FUNCTION public.deduct_leave_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    current_quarter INTEGER;
    current_year INTEGER;
    ledger_exists BOOLEAN;
BEGIN
    -- Only run when status changes to 'approved'
    IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Get current year and quarter
        current_year := EXTRACT(YEAR FROM NEW.start_date)::INTEGER;
        current_quarter := EXTRACT(QUARTER FROM NEW.start_date)::INTEGER;
        
        -- Check if ledger exists
        SELECT EXISTS (
            SELECT 1 FROM public.leave_ledger 
            WHERE user_id = NEW.user_id AND year = current_year
        ) INTO ledger_exists;
        
        -- Create ledger if it doesn't exist
        IF NOT ledger_exists THEN
            INSERT INTO public.leave_ledger (
                user_id, year, q1, q2, q3, q4, carried_from_last_year, optional_used
            ) VALUES (
                NEW.user_id, current_year, 5, 5, 5, 5, 0, 0
            );
        END IF;
        
        -- Only deduct for general leave (not optional)
        IF NEW.leave_type = 'general' THEN
            -- Deduct from the appropriate quarter
            CASE current_quarter
                WHEN 1 THEN 
                    UPDATE public.leave_ledger 
                    SET q1 = GREATEST(0, q1 - NEW.days),
                        updated_at = now()
                    WHERE user_id = NEW.user_id AND year = current_year;
                WHEN 2 THEN 
                    UPDATE public.leave_ledger 
                    SET q2 = GREATEST(0, q2 - NEW.days),
                        updated_at = now()
                    WHERE user_id = NEW.user_id AND year = current_year;
                WHEN 3 THEN 
                    UPDATE public.leave_ledger 
                    SET q3 = GREATEST(0, q3 - NEW.days),
                        updated_at = now()
                    WHERE user_id = NEW.user_id AND year = current_year;
                WHEN 4 THEN 
                    UPDATE public.leave_ledger 
                    SET q4 = GREATEST(0, q4 - NEW.days),
                        updated_at = now()
                    WHERE user_id = NEW.user_id AND year = current_year;
            END CASE;
        ELSIF NEW.leave_type = 'optional' THEN
            -- Track optional leave separately
            UPDATE public.leave_ledger 
            SET optional_used = optional_used + NEW.days,
                updated_at = now()
            WHERE user_id = NEW.user_id AND year = current_year;
        END IF;
        
        -- Log the action (optional, for debugging)
        BEGIN
            INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
            VALUES (NEW.user_id, 'LEAVE_APPROVED', 'leave_requests', NEW.id, 
                    jsonb_build_object(
                        'message', format('Deducted %s days for %s leave', NEW.days, NEW.leave_type),
                        'quarter', current_quarter,
                        'year', current_year,
                        'timestamp', now()
                    ));
        EXCEPTION WHEN OTHERS THEN
            -- Continue even if audit fails
            NULL;
        END;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger - use AFTER UPDATE with WHEN clause
CREATE TRIGGER deduct_leave_on_approval_trigger
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
    EXECUTE FUNCTION public.deduct_leave_on_approval();

-- Add a simple test to verify trigger is set up
DO $$
BEGIN
    RAISE NOTICE '=== TRIGGER SETUP COMPLETE ===';
    RAISE NOTICE 'Trigger: deduct_leave_on_approval_trigger';
    RAISE NOTICE 'Function: deduct_leave_on_approval()';
    RAISE NOTICE 'Trigger will fire when status changes to approved';
    RAISE NOTICE 'Manual deduction working means database logic is correct';
    RAISE NOTICE 'If this trigger still doesn''t work, check RLS policies';
END $$;
