import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveRequest, LeaveType, LeaveStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Client-side deduction function
async function performClientSideDeduction(requestId: string) {
  // Get the approved leave request details
  const { data: request, error: fetchError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;
  if (request.status !== 'approved') throw new Error('Request is not approved');

  // Get current year and quarter
  const currentYear = new Date(request.start_date).getFullYear();
  const currentQuarter = Math.ceil((new Date(request.start_date).getMonth() + 1) / 3);

  // Get or create the user's leave ledger
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

  // Perform deduction based on leave type
  if (request.leave_type === 'general') {
    const updateData: any = {};
    switch (currentQuarter) {
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

  console.log(`Client-side deduction completed: ${request.days} days deducted for ${request.leave_type} leave`);
}

interface CreateLeaveRequest {
  start_date: string;
  end_date: string;
  days: number;
  leave_type: LeaveType;
  reason?: string;
}

interface UpdateLeaveDecision {
  requestId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export function useLeaveRequests() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['leave-requests', user?.id],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as LeaveRequest[]) || [];
    },
    enabled: !!user?.id,
  });
}

export function usePendingRequests() {
  const { user, isManager, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['pending-requests', user?.id, isManager, isAdmin],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) throw new Error('No user ID');

      let query = supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // Admins see all, managers see their team (handled by RLS)
      const { data, error } = await query;

      if (error) throw error;
      return (data as LeaveRequest[]) || [];
    },
    enabled: !!user?.id && (isManager || isAdmin),
  });
}

export function useCreateLeaveRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: CreateLeaveRequest) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user.id,
          ...request,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast({
        title: 'Leave request submitted',
        description: 'Your request has been sent for approval.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useLeaveDecision() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestId, status, rejectionReason }: UpdateLeaveDecision) => {
      if (!user?.id) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (result, variables) => {
      // Invalidate queries immediately
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      
      // If leave was approved, perform client-side deduction
      if (variables.status === 'approved') {
        try {
          await performClientSideDeduction(variables.requestId);
        } catch (error) {
          console.error('Client-side deduction failed:', error);
          toast({
            title: 'Deduction Warning',
            description: 'Leave was approved but automatic deduction failed. Please check balance manually.',
            variant: 'destructive',
          });
        }
      }
      
      // Wait a moment for any database trigger to complete, then refresh balance
      await new Promise(resolve => setTimeout(resolve, 500));
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      
      // Trigger custom event to refresh stats
      window.dispatchEvent(new CustomEvent('refresh-stats'));
      
      toast({
        title: `Leave ${variables.status}`,
        description: `The leave request has been ${variables.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
