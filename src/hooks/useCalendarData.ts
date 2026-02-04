import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { LeaveRequest, OptionalHoliday } from '@/lib/types';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  holidays: any[];
  optionalHolidays: OptionalHoliday[];
  approvedLeave?: LeaveRequest[];
  teamLeave?: LeaveRequest[];
}

export const useCalendarData = (currentDate: Date, viewType: 'personal' | 'team' = 'personal') => {
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const monthDays = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // Get public holidays for current month
  const { data: holidays } = useQuery({
    queryKey: ['holidays', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get optional holidays for current month
  const { data: optionalHolidays } = useQuery({
    queryKey: ['optional-holidays', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optional_holidays')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date');

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get leave requests based on view type
  const { data: leaveData } = useQuery({
    queryKey: [`${viewType}-leave`, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (viewType === 'personal') {
        // Get user's approved leave
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .or(`start_date.gte.${format(monthStart, 'yyyy-MM-dd')},end_date.gte.${format(monthStart, 'yyyy-MM-dd')}`)
          .order('start_date');

        if (error) {
          console.error('Error fetching approved leave:', error);
          return [];
        }
        
        return data || [];
      } else {
        // Get team approved leave
        const { data: requests, error: requestsError } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('status', 'approved')
          .or(`start_date.gte.${format(monthStart, 'yyyy-MM-dd')},end_date.gte.${format(monthStart, 'yyyy-MM-dd')}`)
          .order('start_date');

        if (requestsError) {
          console.error('Error fetching team approved leave:', requestsError);
          return [];
        }

        if (!requests || requests.length === 0) {
          return [];
        }

        // Get profiles for all users
        const userIds = requests.map(req => req.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, department')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return [];
        }

        // Combine data
        return requests.map(request => ({
          ...request,
          profiles: profiles?.find(profile => profile.user_id === request.user_id) || null
        })) as LeaveRequest[];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for leave data
  });

  const calendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    
    // Add days from previous month to fill first week
    const firstDayOfWeek = monthStart.getDay();
    const previousMonth = subMonths(currentDate, 1);
    const previousMonthEnd = endOfMonth(previousMonth);
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(previousMonthEnd);
      date.setDate(previousMonthEnd.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        holidays: [],
        optionalHolidays: [],
        [viewType === 'personal' ? 'approvedLeave' : 'teamLeave']: [],
      });
    }

    // Add days from current month
    monthDays.forEach(date => {
      const dayHolidays = holidays?.filter(holiday => 
        isSameDay(new Date(holiday.date), date)
      ) || [];

      const dayOptionalHolidays = optionalHolidays?.filter(holiday => 
        isSameDay(new Date(holiday.date), date)
      ) || [];

      const dayLeave = leaveData?.filter(leave => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        return date >= leaveStart && date <= leaveEnd;
      }) || [];

      days.push({
        date,
        isCurrentMonth: true,
        holidays: dayHolidays,
        optionalHolidays: dayOptionalHolidays,
        [viewType === 'personal' ? 'approvedLeave' : 'teamLeave']: dayLeave,
      });
    });

    // Add days from next month to fill last week
    const remainingDays = 42 - days.length;
    const nextMonth = addMonths(currentDate, 1);
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      days.push({
        date,
        isCurrentMonth: false,
        holidays: [],
        optionalHolidays: [],
        [viewType === 'personal' ? 'approvedLeave' : 'teamLeave']: [],
      });
    }

    return days;
  }, [currentDate, monthStart, monthEnd, monthDays, holidays, optionalHolidays, leaveData, viewType]);

  return {
    calendarDays,
    holidays,
    optionalHolidays,
    leaveData,
    isLoading: !holidays || !optionalHolidays || !leaveData,
  };
};
