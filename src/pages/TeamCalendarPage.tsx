import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  profiles?: {
    first_name?: string;
    last_name?: string;
  } | null;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'public' | 'optional';
}

export function TeamCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, isManager, isAdmin } = useAuth();

  useEffect(() => {
    fetchCalendarData();
  }, [date]);

  const fetchCalendarData = async () => {
    if (!date) return;
    
    try {
      setLoading(true);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      // Fetch leave requests
      let leaveQuery = supabase
        .from('leave_requests')
        .select('*')
        .gte('start_date', startDate.toISOString().split('T')[0])
        .lte('start_date', endDate.toISOString().split('T')[0]);

      // If not admin/manager, only show own approved leaves
      if (!isManager && !isAdmin && profile) {
        leaveQuery = leaveQuery.eq('user_id', profile.user_id).eq('status', 'approved');
      } else if (profile) {
        // For managers/admins, show team leaves
        leaveQuery = leaveQuery.neq('user_id', profile.user_id);
      }

      const { data: leaves, error: leaveError } = await leaveQuery;

      // Fetch profile information separately
      const userIds = leaves?.map(leave => leave.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Combine leaves with profiles
      const leavesWithProfiles = leaves?.map(leave => ({
        ...leave,
        profiles: profiles?.find(p => p.user_id === leave.user_id) || null
      })) || [];

      // Fetch holidays
      const { data: publicHolidays } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', year)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      const { data: optionalHolidays } = await supabase
        .from('optional_holidays')
        .select('*')
        .eq('year', year)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (leaveError) throw leaveError;

      const allHolidays = [
        ...(publicHolidays || []).map(h => ({ ...h, type: 'public' as const })),
        ...(optionalHolidays || []).map(h => ({ ...h, type: 'optional' as const }))
      ];

      setLeaveRequests(leavesWithProfiles);
      setHolidays(allHolidays);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getModifiers = () => {
    const modifiers: Record<string, Date[]> = {
      approved: [],
      rejected: [],
      pending: [],
      publicHoliday: [],
      optionalHoliday: []
    };

    // Only add leave modifiers for non-admin users
    if (!isManager && !isAdmin) {
      leaveRequests.forEach(leave => {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (leave.status === 'approved') {
            modifiers.approved.push(new Date(dateStr));
          }
        }
      });
    }

    // Add holiday modifiers
    holidays.forEach(holiday => {
      const date = new Date(holiday.date);
      if (holiday.type === 'public') {
        modifiers.publicHoliday.push(date);
      } else {
        modifiers.optionalHoliday.push(date);
      }
    });

    return modifiers;
  };

  const modifiers = getModifiers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Calendar</h1>
        <p className="text-muted-foreground">
          {isManager || isAdmin 
            ? "View your team's leaves and holidays at a glance"
            : "View your leaves and company holidays at a glance"
          }
        </p>
      </div>

      {/* Legends */}
      <Card>
        <CardHeader>
          <CardTitle>Legends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-sm">Optional Holiday</span>
            </div>
            {!(isManager || isAdmin) && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-sm">Approved Leave</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
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
            modifiers={{
              approved: modifiers.approved,
              rejected: modifiers.rejected,
              pending: modifiers.pending,
              publicHoliday: modifiers.publicHoliday,
              optionalHoliday: modifiers.optionalHoliday
            }}
            modifiersStyles={{
              ...( !isManager && !isAdmin ? {
                approved: { 
                  backgroundColor: '#16a34a', // green-600
                  color: 'white',
                  fontWeight: 'bold'
                }
              } : {}),
              publicHoliday: { 
                backgroundColor: '#3b82f6', // blue-500
                color: 'white',
                fontWeight: 'bold'
              },
              optionalHoliday: { 
                backgroundColor: '#f59e0b', // amber-500
                color: 'white',
                fontWeight: 'bold'
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Details for selected date */}
      {date && (
        <Card>
          <CardHeader>
            <CardTitle>
              Details for {date.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Holidays on selected date */}
              {holidays
                .filter(holiday => 
                  new Date(holiday.date).toDateString() === date.toDateString()
                )
                .map(holiday => (
                  <div key={holiday.id} className="flex items-center gap-2">
                    <Badge 
                      variant={holiday.type === 'public' ? 'default' : 'secondary'}
                    >
                      {holiday.type === 'public' ? 'Public' : 'Optional'} Holiday
                    </Badge>
                    <span>{holiday.name}</span>
                  </div>
                ))
              }

              {/* Leaves on selected date - Only show for non-admin users */}
              {!(isManager || isAdmin) && leaveRequests
                .filter(leave => {
                  const startDate = new Date(leave.start_date);
                  const endDate = new Date(leave.end_date);
                  return date >= startDate && date <= endDate;
                })
                .map(leave => (
                  <div key={leave.id} className="flex items-center gap-2">
                    <Badge 
                      variant={
                        leave.status === 'approved' ? 'default' :
                        leave.status === 'rejected' ? 'destructive' : 'secondary'
                      }
                    >
                      {leave.status}
                    </Badge>
                    <span>
                      {leave.profiles?.first_name} {leave.profiles?.last_name}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </span>
                  </div>
                ))
              }

              {/* No events */}
              {holidays.filter(holiday => 
                new Date(holiday.date).toDateString() === date.toDateString()
              ).length === 0 &&
              ((isManager || isAdmin) || 
               leaveRequests.filter(leave => {
                 const startDate = new Date(leave.start_date);
                 const endDate = new Date(leave.end_date);
                 return date >= startDate && date <= endDate;
               }).length === 0) && (
                <p className="text-muted-foreground">
                  {holidays.filter(holiday => 
                    new Date(holiday.date).toDateString() === date.toDateString()
                  ).length === 0 ? 'No holidays or leaves on this date' : 'No holidays on this date'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
