import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveRequest, LeaveType, LeaveStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
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
