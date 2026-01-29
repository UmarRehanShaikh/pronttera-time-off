-- Fix the leave deduction system completely
-- Drop any existing triggers and functions first
DROP TRIGGER IF EXISTS deduct_leave_on_approval_trigger ON public.leave_requests;
DROP FUNCTION IF EXISTS public.deduct_leave_on_approval();

-- Create a comprehensive leave deduction function
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
    -- Only proceed if status is being set to 'approved'
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
          AND year = current_year;
        
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
            
            -- Don't deduct from general balance for optional leave
            days_to_deduct := 0;
        END IF;
        
        -- Log the action for debugging
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
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
CREATE TRIGGER deduct_leave_on_approval_trigger
    AFTER UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_leave_on_approval();

-- Create a function to manually trigger leave deduction for debugging
CREATE OR REPLACE FUNCTION public.manual_leave_deduction(p_request_id UUID)
RETURNS TEXT AS $$
DECLARE
    leave_record RECORD;
    result TEXT;
BEGIN
    -- Get the leave request
    SELECT * INTO leave_record
    FROM public.leave_requests
    WHERE id = p_request_id;
    
    IF leave_record IS NULL THEN
        RETURN 'Leave request not found';
    END IF;
    
    IF leave_record.status != 'approved' THEN
        RETURN 'Leave request is not approved';
    END IF;
    
    -- Manually trigger the deduction logic
    UPDATE public.leave_requests
    SET status = 'approved',
        updated_at = now()
    WHERE id = p_request_id;
    
    result := format('Manual deduction triggered for request %s, user %s, %s days',
                    p_request_id, leave_record.user_id, leave_record.days);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to check current ledger status
CREATE OR REPLACE FUNCTION public.check_leave_balance(p_user_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS TABLE (
    year INTEGER,
    q1 INTEGER,
    q2 INTEGER,
    q3 INTEGER,
    q4 INTEGER,
    carried_from_last_year INTEGER,
    optional_used INTEGER,
    total_available INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ll.year,
        ll.q1,
        ll.q2,
        ll.q3,
        ll.q4,
        ll.carried_from_last_year,
        ll.optional_used,
        (ll.q1 + ll.q2 + ll.q3 + ll.q4 + ll.carried_from_last_year) as total_available
    FROM public.leave_ledger ll
    WHERE ll.user_id = p_user_id 
      AND (p_year IS NULL OR ll.year = p_year)
    ORDER BY ll.year DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
