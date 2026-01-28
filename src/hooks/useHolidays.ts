import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicHoliday {
  id: string;
  year: number;
  name: string;
  date: string;
  created_at: string;
}

export interface OptionalHoliday {
  id: string;
  year: number;
  name: string;
  date: string;
  created_at: string;
}

export interface ApprovedLeave {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  days: number;
  leave_type: 'general' | 'optional';
  reason: string | null;
  employee_name: string;
}

export function usePublicHolidays(year: number) {
  return useQuery({
    queryKey: ['public-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', year);

      if (error) throw error;
      return data as PublicHoliday[];
    },
  });
}

export function useOptionalHolidays(year: number) {
  return useQuery({
    queryKey: ['optional-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optional_holidays')
        .select('*')
        .eq('year', year);

      if (error) throw error;
      return data as OptionalHoliday[];
    },
  });
}

export function useApprovedLeaves(year: number) {
  return useQuery({
    queryKey: ['approved-leaves', year],
    queryFn: async () => {
      // Get approved leaves for the year
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select('id, user_id, start_date, end_date, days, leave_type, reason')
        .eq('status', 'approved')
        .gte('start_date', startOfYear)
        .lte('end_date', endOfYear);

      if (leavesError) throw leavesError;

      if (!leaves || leaves.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(leaves.map(l => l.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to name
      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, `${p.first_name} ${p.last_name}`])
      );

      // Combine leaves with employee names
      return leaves.map(leave => ({
        ...leave,
        employee_name: profileMap.get(leave.user_id) || 'Unknown Employee',
      })) as ApprovedLeave[];
    },
  });
}

export function useAllHolidays(year: number) {
  const publicHolidays = usePublicHolidays(year);
  const optionalHolidays = useOptionalHolidays(year);

  return {
    publicHolidays: publicHolidays.data || [],
    optionalHolidays: optionalHolidays.data || [],
    isLoading: publicHolidays.isLoading || optionalHolidays.isLoading,
    error: publicHolidays.error || optionalHolidays.error,
  };
}

export function useCalendarData(year: number) {
  const publicHolidays = usePublicHolidays(year);
  const optionalHolidays = useOptionalHolidays(year);
  const approvedLeaves = useApprovedLeaves(year);

  return {
    publicHolidays: publicHolidays.data || [],
    optionalHolidays: optionalHolidays.data || [],
    approvedLeaves: approvedLeaves.data || [],
    isLoading: publicHolidays.isLoading || optionalHolidays.isLoading || approvedLeaves.isLoading,
    error: publicHolidays.error || optionalHolidays.error || approvedLeaves.error,
  };
}
