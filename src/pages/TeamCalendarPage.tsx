import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useState, useMemo } from 'react';
import { useCalendarData, ApprovedLeave } from '@/hooks/useHolidays';
import { format, parseISO, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TeamCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const currentYear = date?.getFullYear() || new Date().getFullYear();
  
  const { publicHolidays, optionalHolidays, approvedLeaves, isLoading } = useCalendarData(currentYear);

  // Create date sets for quick lookup
  const publicHolidayDates = useMemo(() => 
    new Set(publicHolidays.map(h => h.date)),
    [publicHolidays]
  );

  const optionalHolidayDates = useMemo(() => 
    new Set(optionalHolidays.map(h => h.date)),
    [optionalHolidays]
  );

  // Create a set of all dates with approved leaves
  const approvedLeaveDates = useMemo(() => {
    const dates = new Set<string>();
    approvedLeaves.forEach(leave => {
      const start = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      eachDayOfInterval({ start, end }).forEach(day => {
        dates.add(format(day, 'yyyy-MM-dd'));
      });
    });
    return dates;
  }, [approvedLeaves]);

  // Get info for selected date
  const selectedDateInfo = useMemo(() => {
    if (!date) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const publicHoliday = publicHolidays.find(h => h.date === dateStr);
    const optionalHoliday = optionalHolidays.find(h => h.date === dateStr);
    
    // Find all leaves that include this date
    const leavesOnDate = approvedLeaves.filter(leave => {
      const start = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      return isWithinInterval(date, { start, end });
    });

    return {
      publicHoliday,
      optionalHoliday,
      leaves: leavesOnDate,
    };
  }, [date, publicHolidays, optionalHolidays, approvedLeaves]);

  // Custom modifiers for the calendar
  const modifiers = useMemo(() => ({
    publicHoliday: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return publicHolidayDates.has(dateStr);
    },
    optionalHoliday: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return optionalHolidayDates.has(dateStr) && !publicHolidayDates.has(dateStr);
    },
    approvedLeave: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return approvedLeaveDates.has(dateStr) && 
             !publicHolidayDates.has(dateStr) && 
             !optionalHolidayDates.has(dateStr);
    },
  }), [publicHolidayDates, optionalHolidayDates, approvedLeaveDates]);

  const modifiersClassNames = {
    publicHoliday: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    optionalHoliday: 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90',
    approvedLeave: 'bg-primary text-primary-foreground hover:bg-primary/90',
  };

  // Get upcoming leaves
  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    return approvedLeaves
      .filter(l => parseISO(l.end_date) >= today)
      .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())
      .slice(0, 5);
  }, [approvedLeaves]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Calendar</h1>
        <p className="text-muted-foreground">
          View your team's approved leaves and holidays at a glance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leave Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <span className="text-muted-foreground">Loading calendar...</span>
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border pointer-events-auto"
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-destructive" />
                <span className="text-sm">Public Holiday</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-yellow-500" />
                <span className="text-sm">Optional Holiday</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded bg-primary" />
                <span className="text-sm">Team Leave</span>
              </div>
            </CardContent>
          </Card>

          {selectedDateInfo && (selectedDateInfo.publicHoliday || selectedDateInfo.optionalHoliday || selectedDateInfo.leaves.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {date && format(date, 'MMMM d, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDateInfo.publicHoliday && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Public Holiday</Badge>
                    <span className="text-sm font-medium">{selectedDateInfo.publicHoliday.name}</span>
                  </div>
                )}
                {selectedDateInfo.optionalHoliday && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90">Optional</Badge>
                    <span className="text-sm font-medium">{selectedDateInfo.optionalHoliday.name}</span>
                  </div>
                )}
                {selectedDateInfo.leaves.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Team members on leave:</p>
                    {selectedDateInfo.leaves.map(leave => (
                      <div key={leave.id} className="flex items-center gap-2">
                        <Badge variant="default">{leave.leave_type}</Badge>
                        <span className="text-sm">{leave.employee_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Team Leaves</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {upcomingLeaves.map(leave => (
                    <div key={leave.id} className="flex flex-col gap-1 text-sm border-b pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{leave.employee_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {leave.days} day{leave.days > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {format(parseISO(leave.start_date), 'MMM d')}
                        {leave.start_date !== leave.end_date && ` - ${format(parseISO(leave.end_date), 'MMM d')}`}
                      </span>
                    </div>
                  ))}
                  {upcomingLeaves.length === 0 && (
                    <p className="text-sm text-muted-foreground">No upcoming team leaves</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
