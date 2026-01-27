import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveLedger, LeaveBalance } from '@/lib/types';

export function useLeaveBalance(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ['leave-balance', targetUserId, currentYear],
    queryFn: async (): Promise<LeaveBalance> => {
      if (!targetUserId) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('year', currentYear)
        .maybeSingle();

      if (error) throw error;

      const ledger = data as LeaveLedger | null;

      if (!ledger) {
        return {
          q1: 0,
          q2: 0,
          q3: 0,
          q4: 0,
          carried: 0,
          total: 0,
          optionalUsed: 0,
          optionalRemaining: 4,
        };
      }

      const total = ledger.q1 + ledger.q2 + ledger.q3 + ledger.q4 + ledger.carried_from_last_year;

      return {
        q1: ledger.q1,
        q2: ledger.q2,
        q3: ledger.q3,
        q4: ledger.q4,
        carried: ledger.carried_from_last_year,
        total,
        optionalUsed: ledger.optional_used,
        optionalRemaining: 4 - ledger.optional_used,
      };
    },
    enabled: !!targetUserId,
  });
}
