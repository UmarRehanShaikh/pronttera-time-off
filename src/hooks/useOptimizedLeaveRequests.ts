import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { LeaveRequest } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export const useOptimizedLeaveRequests = () => {
  const { user, profile, isAdmin, isManager } = useAuth();

  // Get pending requests with manual profile join
  const { data: pendingRequests, isLoading: isLoadingPending, error: pendingError } = useQuery({
    queryKey: ['pending-requests', user?.id, isManager, isAdmin],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) throw new Error('No user ID');
      
      const { data: requests, error: requestsError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (requestsError) throw requestsError;
      if (!requests || requests.length === 0) return [];
      
      const userIds = requests.map(req => req.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, department')
        .in('user_id', userIds);
      
      if (profilesError) throw profilesError;
      
      return requests.map(request => ({
        ...request,
        profiles: profiles?.find(profile => profile.user_id === request.user_id) || null
      }));
    },
    enabled: !!user?.id && (isManager || isAdmin),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get user's leave history
  const { data: userLeaveHistory, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ['user-leave-history', user?.id],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get approved leave for current month
  const { data: approvedLeave, isLoading: isLoadingApproved, error: approvedError } = useQuery({
    queryKey: ['approved-leave', user?.id, format(new Date(), 'yyyy-MM')],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!user?.id) return [];
      
      const currentDate = new Date();
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .or(`start_date.gte.${format(monthStart, 'yyyy-MM-dd')},end_date.gte.${format(monthStart, 'yyyy-MM-dd')}`)
        .order('start_date');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    pendingRequests,
    userLeaveHistory,
    approvedLeave,
    isLoading: {
      pending: isLoadingPending,
      history: isLoadingHistory,
      approved: isLoadingApproved,
    },
    errors: {
      pending: pendingError,
      history: historyError,
      approved: approvedError,
    },
  };
};
