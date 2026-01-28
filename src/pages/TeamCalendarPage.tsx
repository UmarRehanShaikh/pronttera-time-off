import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';

export function TeamCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Calendar</h1>
        <p className="text-muted-foreground">
          View your team's approved leaves at a glance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border pointer-events-auto"
          />
        </CardContent>
      </Card>
    </div>
  );
}
