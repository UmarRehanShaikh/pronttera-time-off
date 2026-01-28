import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useState, useMemo } from 'react';
import { useAllHolidays } from '@/hooks/useHolidays';
import { format, parseISO, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export function TeamCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const currentYear = date?.getFullYear() || new Date().getFullYear();
  
  const { publicHolidays, optionalHolidays, isLoading } = useAllHolidays(currentYear);

  // Create date sets for quick lookup
  const publicHolidayDates = useMemo(() => 
    new Set(publicHolidays.map(h => h.date)),
    [publicHolidays]
  );

  const optionalHolidayDates = useMemo(() => 
    new Set(optionalHolidays.map(h => h.date)),
    [optionalHolidays]
  );

  // Get holiday name for selected date
  const selectedDateHoliday = useMemo(() => {
    if (!date) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const publicHoliday = publicHolidays.find(h => h.date === dateStr);
    if (publicHoliday) return { ...publicHoliday, type: 'public' as const };
    
    const optionalHoliday = optionalHolidays.find(h => h.date === dateStr);
    if (optionalHoliday) return { ...optionalHoliday, type: 'optional' as const };
    
    return null;
  }, [date, publicHolidays, optionalHolidays]);

  // Custom modifiers for the calendar
  const modifiers = useMemo(() => ({
    publicHoliday: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return publicHolidayDates.has(dateStr);
    },
    optionalHoliday: (day: Date) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return optionalHolidayDates.has(dateStr);
    },
  }), [publicHolidayDates, optionalHolidayDates]);

  const modifiersClassNames = {
    publicHoliday: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    optionalHoliday: 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90',
  };

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
                <span className="text-muted-foreground">Loading holidays...</span>
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
            </CardContent>
          </Card>

          {selectedDateHoliday && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Date</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {date && format(date, 'MMMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedDateHoliday.type === 'public' ? 'destructive' : 'secondary'}
                      className={selectedDateHoliday.type === 'optional' ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90' : ''}
                    >
                      {selectedDateHoliday.type === 'public' ? 'Public' : 'Optional'}
                    </Badge>
                    <span className="font-medium">{selectedDateHoliday.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {[...publicHolidays, ...optionalHolidays]
                  .filter(h => parseISO(h.date) >= new Date())
                  .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
                  .slice(0, 5)
                  .map((holiday) => {
                    const isPublic = publicHolidays.some(h => h.id === holiday.id);
                    return (
                      <div key={holiday.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${isPublic ? 'bg-destructive' : 'bg-yellow-500'}`} />
                          <span>{holiday.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {format(parseISO(holiday.date), 'MMM d')}
                        </span>
                      </div>
                    );
                  })}
                {publicHolidays.length === 0 && optionalHolidays.length === 0 && (
                  <p className="text-sm text-muted-foreground">No holidays configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
