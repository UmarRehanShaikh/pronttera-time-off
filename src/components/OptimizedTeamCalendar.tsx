import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Clock, Users } from 'lucide-react';
import { format, isSameDay, addMonths, subMonths } from 'date-fns';
import { useCalendarData } from '@/hooks/useCalendarData';
import { LeaveRequest } from '@/lib/types';

interface OptimizedTeamCalendarProps {
  viewType: 'personal' | 'team';
  title?: string;
  description?: string;
}

const getDayClassName = (day: any, viewType: 'personal' | 'team') => {
  const baseClasses = 'h-12 p-1 text-sm border border-gray-200 relative';
  const monthClasses = day.isCurrentMonth ? '' : 'bg-gray-50 text-gray-400';
  
  // Check if today
  const isToday = isSameDay(day.date, new Date());
  
  // Determine background color based on event type
  const leaveData = viewType === 'personal' ? day.approvedLeave : day.teamLeave;
  if (leaveData && leaveData.length > 0) {
    const color = viewType === 'personal' ? 'blue' : 'purple';
    return `${baseClasses} ${monthClasses} bg-${color}-100 border-${color}-300 text-${color}-900 ${isToday ? `ring-2 ring-${color}-500` : ''}`;
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

export default function OptimizedTeamCalendar({ viewType, title, description }: OptimizedTeamCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { calendarDays, holidays, optionalHolidays, leaveData, isLoading } = useCalendarData(currentDate, viewType);
  const typedLeaveData = leaveData as LeaveRequest[];

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  }, []);

  const legendItems = useMemo(() => [
    { color: viewType === 'personal' ? 'blue' : 'purple', label: viewType === 'personal' ? 'Your Approved Leave' : 'Team Leave' },
    { color: 'red', label: 'Public Holiday' },
    { color: 'yellow', label: 'Optional Holiday' },
    { color: 'gray', label: 'Weekend' },
    { color: 'green', label: 'Today', border: true },
  ], [viewType]);

  const weekdayHeaders = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {title || 'Team Calendar'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-7 gap-0 border border-gray-300">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 border border-gray-200"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {title || 'Team Calendar'}
              </CardTitle>
              <CardDescription>
                {description || (viewType === 'personal' 
                  ? 'View your approved leave, holidays, and optional holidays'
                  : 'View team leave requests, holidays, and optional holidays'
                )}
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
            {weekdayHeaders.map(day => (
              <div key={day} className="h-10 p-2 text-center font-semibold border-b border-gray-300 bg-gray-50">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div key={index} className={getDayClassName(day, viewType)}>
                <div className="text-center font-medium">
                  {format(day.date, 'd')}
                </div>
                
                {/* Show multiple person indicator for team view */}
                {viewType === 'team' && day.teamLeave && day.teamLeave.length > 1 && (
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
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {item.border ? (
                  <div className={`w-4 h-4 bg-white border-2 border-${item.color}-500 rounded`}></div>
                ) : (
                  <div className={`w-4 h-4 bg-${item.color}-500 rounded`}></div>
                )}
                <span className="text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Month Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leave Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className={`h-5 w-5 text-${viewType === 'personal' ? 'blue' : 'purple'}-500`} />
              {viewType === 'personal' ? 'Your Approved Leave' : 'Team Approved Leave'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!typedLeaveData || typedLeaveData.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {viewType === 'personal' ? 'No approved leave this month' : 'No team approved leave this month'}
              </p>
            ) : (
              typedLeaveData.map(leave => (
                <div key={leave.id} className="flex items-start gap-2">
                  <div className={`w-2 h-2 bg-${viewType === 'personal' ? 'blue' : 'purple'}-500 rounded-full mt-2 flex-shrink-0`}></div>
                  <div>
                    <p className="font-medium text-sm">
                      {viewType === 'personal' 
                        ? 'Your Leave'
                        : `${leave.profiles?.first_name} ${leave.profiles?.last_name}`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                    </p>
                    {viewType === 'team' && leave.profiles?.department && (
                      <p className="text-xs text-muted-foreground">
                        {leave.profiles.department}
                      </p>
                    )}
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
            {!holidays || holidays.length === 0 ? (
              <p className="text-muted-foreground text-sm">No public holidays this month</p>
            ) : (
              holidays.map(holiday => (
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
            {!optionalHolidays || optionalHolidays.length === 0 ? (
              <p className="text-muted-foreground text-sm">No optional holidays this month</p>
            ) : (
              optionalHolidays.map(holiday => (
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
