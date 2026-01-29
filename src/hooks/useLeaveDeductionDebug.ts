import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useLeaveDeductionDebug() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const checkLedgerStatus = useMutation({
    mutationFn: async (userId?: string) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) throw new Error('No user ID');

      const currentYear = new Date().getFullYear();

      // Check ledger status
      const { data: ledger, error: ledgerError } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('year', currentYear)
        .maybeSingle();

      if (ledgerError) throw ledgerError;

      // Get approved leave requests
      const { data: approvedRequests, error: requestsError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('status', 'approved')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('start_date', `${currentYear}-12-31`);

      if (requestsError) throw requestsError;

      // Calculate expected usage
      let q1Expected = 0, q2Expected = 0, q3Expected = 0, q4Expected = 0;
      let optionalExpected = 0;

      approvedRequests?.forEach(request => {
        const quarter = Math.ceil((new Date(request.start_date).getMonth() + 1) / 3);
        
        if (request.leave_type === 'general') {
          switch (quarter) {
            case 1: q1Expected += request.days; break;
            case 2: q2Expected += request.days; break;
            case 3: q3Expected += request.days; break;
            case 4: q4Expected += request.days; break;
          }
        } else if (request.leave_type === 'optional') {
          optionalExpected += request.days;
        }
      });

      const expectedQ1 = Math.max(0, 5 - q1Expected);
      const expectedQ2 = Math.max(0, 5 - q2Expected);
      const expectedQ3 = Math.max(0, 5 - q3Expected);
      const expectedQ4 = Math.max(0, 5 - q4Expected);

      return {
        ledger,
        approvedRequests,
        expected: {
          q1: expectedQ1,
          q2: expectedQ2,
          q3: expectedQ3,
          q4: expectedQ4,
          optional: optionalExpected,
          total: expectedQ1 + expectedQ2 + expectedQ3 + expectedQ4
        },
        actual: ledger ? {
          q1: ledger.q1,
          q2: ledger.q2,
          q3: ledger.q3,
          q4: ledger.q4,
          optional: ledger.optional_used,
          total: ledger.q1 + ledger.q2 + ledger.q3 + ledger.q4 + ledger.carried_from_last_year
        } : null,
        mismatch: ledger ? {
          q1: expectedQ1 !== ledger.q1,
          q2: expectedQ2 !== ledger.q2,
          q3: expectedQ3 !== ledger.q3,
          q4: expectedQ4 !== ledger.q4,
          optional: optionalExpected !== ledger.optional_used
        } : null
      };
    },
    onSuccess: (result) => {
      console.log('Leave Balance Debug Result:', result);
      
      if (result.mismatch && Object.values(result.mismatch).some(Boolean)) {
        toast({
          title: 'Balance Mismatch Detected',
          description: 'Some balances don\'t match expected values. Check console for details.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Balance Check Complete',
          description: 'All balances appear to be correct.',
        });
      }
    },
    onError: (error) => {
      console.error('Debug error:', error);
      toast({
        title: 'Debug Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const manualDeduction = useMutation({
    mutationFn: async (requestId: string) => {
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      if (request.status !== 'approved') {
        throw new Error('Request is not approved');
      }

      // Get the user's ledger
      const currentYear = new Date().getFullYear();
      const { data: ledger, error: ledgerError } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('user_id', request.user_id)
        .eq('year', currentYear)
        .maybeSingle();

      if (ledgerError) throw ledgerError;

      // Create ledger if it doesn't exist
      if (!ledger) {
        const { error: insertError } = await supabase
          .from('leave_ledger')
          .insert({
            user_id: request.user_id,
            year: currentYear,
            q1: 5, q2: 5, q3: 5, q4: 5,
            carried_from_last_year: 0,
            optional_used: 0
          });

        if (insertError) throw insertError;
      }

      // Calculate quarter and deduct
      const quarter = Math.ceil((new Date(request.start_date).getMonth() + 1) / 3);
      
      if (request.leave_type === 'general') {
        const updateData: any = {};
        switch (quarter) {
          case 1: updateData.q1 = Math.max(0, (ledger?.q1 || 5) - request.days); break;
          case 2: updateData.q2 = Math.max(0, (ledger?.q2 || 5) - request.days); break;
          case 3: updateData.q3 = Math.max(0, (ledger?.q3 || 5) - request.days); break;
          case 4: updateData.q4 = Math.max(0, (ledger?.q4 || 5) - request.days); break;
        }

        const { error: updateError } = await supabase
          .from('leave_ledger')
          .update(updateData)
          .eq('user_id', request.user_id)
          .eq('year', currentYear);

        if (updateError) throw updateError;
      } else if (request.leave_type === 'optional') {
        const { error: updateError } = await supabase
          .from('leave_ledger')
          .update({
            optional_used: (ledger?.optional_used || 0) + request.days
          })
          .eq('user_id', request.user_id)
          .eq('year', currentYear);

        if (updateError) throw updateError;
      }

      return `Manual deduction completed for request ${requestId}`;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast({
        title: 'Manual Deduction Triggered',
        description: result,
      });
    },
    onError: (error) => {
      toast({
        title: 'Manual Deduction Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    checkLedgerStatus,
    manualDeduction,
  };
}
