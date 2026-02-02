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
    department?: string;
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

      console.log('Debug - Leave query result:', leaves?.length, 'leaves found');

      // Fetch profile information separately
      const userIds = leaves?.map(leave => leave.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, department')
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
      publicHoliday: [],
      optionalHoliday: []
    };

    // Add leave modifiers for approved leaves only
    leaveRequests.forEach(leave => {
      if (leave.status === 'approved') {
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        
        // Add each day in the leave range to the modifiers
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          modifiers.approved.push(new Date(dateStr));
        }
      }
    });

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
              <div className="w-4 h-4 bg-violet-500 rounded"></div>
              <span className="text-sm">Optional Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 ${isManager || isAdmin ? 'bg-red-600' : 'bg-green-600'} rounded`}></div>
              <span className="text-sm">Approved Leave</span>
            </div>
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
              publicHoliday: modifiers.publicHoliday,
              optionalHoliday: modifiers.optionalHoliday
            }}
            modifiersStyles={{
              approved: { 
                backgroundColor: isManager || isAdmin ? '#dc2626' : '#16a34a',
                color: 'white',
                fontWeight: 'bold'
              },
              publicHoliday: { 
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 'bold'
              },
              optionalHoliday: { 
                backgroundColor: '#8b5cf6',
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
              Employees on Leave - {date.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Holidays on selected date */}
            {holidays
              .filter(holiday => 
                new Date(holiday.date).toDateString() === date.toDateString()
              )
              .map(holiday => (
                <div key={holiday.id} className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={holiday.type === 'public' ? 'default' : 'secondary'}
                    >
                      {holiday.type === 'public' ? 'Public' : 'Optional'} Holiday
                    </Badge>
                    <span className="font-medium">{holiday.name}</span>
                  </div>
                </div>
              ))
            }

            {/* Employees on leave */}
            {(() => {
              const employeesOnLeave = leaveRequests.filter(leave => {
                if (leave.status !== 'approved') return false;
                
                const startDate = new Date(leave.start_date);
                const endDate = new Date(leave.end_date);
                const selectedDate = new Date(date);
                
                // Reset time to midnight for accurate date comparison
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);
                
                // Check if selected date is within the leave range (inclusive)
                return selectedDate >= startDate && selectedDate <= endDate;
              });

              return employeesOnLeave.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 mb-3">Team Members on Leave:</h4>
                  {employeesOnLeave.map(leave => (
                    <div key={leave.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-medium text-gray-900">
                          {leave.profiles?.first_name} {leave.profiles?.last_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                          {leave.profiles?.department || 'No Department'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* No employees on leave */}
            {(() => {
              const employeesOnLeave = leaveRequests.filter(leave => {
                if (leave.status !== 'approved') return false;
                
                const startDate = new Date(leave.start_date);
                const endDate = new Date(leave.end_date);
                const selectedDate = new Date(date);
                
                // Reset time to midnight for accurate date comparison
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                selectedDate.setHours(0, 0, 0, 0);
                
                return selectedDate >= startDate && selectedDate <= endDate;
              });

              const holidaysOnDate = holidays.filter(holiday => 
                new Date(holiday.date).toDateString() === date.toDateString()
              );

              return employeesOnLeave.length === 0 && holidaysOnDate.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg mb-2">📅</div>
                  <p>No employees on leave on this date</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
