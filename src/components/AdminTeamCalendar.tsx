import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Clock, Users, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { LeaveRequest, OptionalHoliday } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  holidays: any[];
  optionalHolidays: OptionalHoliday[];
  teamLeave: LeaveRequest[];
}

export default function AdminTeamCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const { profile, isAdmin, isManager } = useAuth();

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
  });

  // Get team approved leave requests for current month
  const { data: teamLeave } = useQuery({
    queryKey: ['team-approved-leave', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!profile?.user_id) return [];

      // First get the approved requests
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

      // Then get the profiles for all users in the requests
      const userIds = requests.map(req => req.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, department')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Combine the data
      const requestsWithProfiles = requests.map(request => ({
        ...request,
        profiles: profiles?.find(profile => profile.user_id === request.user_id) || null
      }));
      
      console.log('Team approved leave:', requestsWithProfiles);
      return requestsWithProfiles as LeaveRequest[];
    },
    enabled: !!profile?.user_id && (isAdmin || isManager),
  });

  const getCalendarDays = (): CalendarDay[] => {
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
        teamLeave: [],
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

      const dayTeamLeave = teamLeave?.filter(leave => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        return date >= leaveStart && date <= leaveEnd;
      }) || [];

      days.push({
        date,
        isCurrentMonth: true,
        holidays: dayHolidays,
        optionalHolidays: dayOptionalHolidays,
        teamLeave: dayTeamLeave,
      });
    });

    // Add days from next month to fill last week
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    const nextMonth = addMonths(currentDate, 1);
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      days.push({
        date,
        isCurrentMonth: false,
        holidays: [],
        optionalHolidays: [],
        teamLeave: [],
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const getDayClassName = (day: CalendarDay) => {
    const baseClasses = 'h-12 p-1 text-sm border border-gray-200 relative';
    const monthClasses = day.isCurrentMonth ? '' : 'bg-gray-50 text-gray-400';
    
    // Check if today
    const isToday = isSameDay(day.date, new Date());
    
    // Determine background color based on event type
    if (day.teamLeave.length > 0) {
      return `${baseClasses} ${monthClasses} bg-purple-100 border-purple-300 text-purple-900 ${isToday ? 'ring-2 ring-purple-500' : ''}`;
    } else if (day.holidays.length > 0) {
      return `${baseClasses} ${monthClasses} bg-red-100 border-red-300 text-red-900 ${isToday ? 'ring-2 ring-red-500' : ''}`;
    } else if (day.optionalHolidays.length > 0) {
      return `${baseClasses} ${monthClasses} bg-yellow-100 border-yellow-300 text-yellow-900 ${isToday ? 'ring-2 ring-yellow-500' : ''}`;
    } else if (day.date.getDay() === 0 || day.date.getDay() === 6) {
      return `${baseClasses} ${monthClasses} bg-gray-100 border-gray-300 text-gray-700 ${isToday ? 'ring-2 ring-gray-500' : ''}`;
    } else {
      return `${baseClasses} ${monthClasses} bg-white border-gray-200 text-gray-900 ${isToday ? 'ring-2 ring-green-500' : ''}`;
    }
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Team Calendar
              </CardTitle>
              <CardDescription>
                View team leave requests, holidays, and optional holidays
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 border border-gray-300">
            {/* Weekday headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="h-10 p-2 text-center font-semibold border-b border-gray-300 bg-gray-50">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div key={index} className={getDayClassName(day)}>
                <div className="text-center font-medium">
                  {format(day.date, 'd')}
                </div>
                
                {/* Show team leave count if multiple people on leave */}
                {day.teamLeave.length > 1 && (
                  <div className="absolute top-1 right-1">
                    <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                      {day.teamLeave.length}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm">Team Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">Optional Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span className="text-sm">Weekend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-green-500 rounded"></div>
              <span className="text-sm">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Month Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Leave */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-500" />
              Team Approved Leave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamLeave?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No team approved leave this month</p>
            ) : (
              teamLeave?.map(leave => (
                <div key={leave.id} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">
                      {leave.profiles?.first_name} {leave.profiles?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {leave.profiles?.department || 'No Department'}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {leave.days} day{leave.days !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Public Holidays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-red-500" />
              Public Holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {holidays?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No public holidays this month</p>
            ) : (
              holidays?.map(holiday => (
                <div key={holiday.id} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(holiday.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Optional Holidays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-yellow-500" />
              Optional Holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {optionalHolidays?.length === 0 ? (
              <p className="text-muted-foreground text-sm">No optional holidays this month</p>
            ) : (
              optionalHolidays?.map(holiday => (
                <div key={holiday.id} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-sm">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(holiday.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
