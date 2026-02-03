import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users, Download, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { DailyAttendance, Profile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useDateRange, setUseDateRange] = useState(false);

  // Get attendance data for selected date or date range
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', useDateRange ? `${startDate}-${endDate}` : selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        // Using 'any' to bypass TypeScript error until database tables are created
        let punchesQuery = (supabase as any).from('punch_records').select('*');
        
        if (useDateRange) {
          // Filter by date range
          punchesQuery = punchesQuery
            .gte('punch_time', `${startDate}T00:00:00.000Z`)
            .lte('punch_time', `${endDate}T23:59:59.999Z`);
        } else {
          // Filter by single date
          const dateStr = selectedDate.toISOString().split('T')[0];
          punchesQuery = punchesQuery
            .gte('punch_time', dateStr)
            .lt('punch_time', new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000).toISOString());
        }
        
        const { data: punches, error: punchError } = await punchesQuery
          .order('punch_time', { ascending: true });

        if (punchError?.message?.includes('does not exist')) {
          console.log('punch_records table not found, returning empty array');
          return [];
        }
        
        if (punchError) throw punchError;

        // Get user profiles (excluding admins)
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_active', true);

        if (profileError) throw profileError;

        // Get user roles to filter out admins
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Filter out admin users
        const adminUserIds = userRoles
          ?.filter((role: any) => role.role === 'admin')
          .map((role: any) => role.user_id) || [];

        const nonAdminProfiles = profiles?.filter((profile: Profile) => 
          !adminUserIds.includes(profile.user_id)
        ) || [];

        // Process attendance data
        const attendanceMap = new Map<string, any>();
        
        // Initialize all non-admin users (employees and interns only)
        nonAdminProfiles.forEach((profile: Profile) => {
          attendanceMap.set(profile.user_id, {
            user_id: profile.user_id,
            date: useDateRange ? `${startDate} to ${endDate}` : selectedDate.toISOString().split('T')[0],
            punch_in: null,
            punch_out: null,
            total_hours: null,
            status: 'absent' as const,
            user: profile
          });
        });

        // Process punch records
        punches?.forEach((punch: any) => {
          const userAttendance = attendanceMap.get(punch.user_id);
          if (!userAttendance) return;

          if (punch.punch_type === 'in' && !userAttendance.punch_in) {
            userAttendance.punch_in = punch.punch_time;
            userAttendance.status = 'partial';
          } else if (punch.punch_type === 'out' && userAttendance.punch_in) {
            userAttendance.punch_out = punch.punch_time;
            // Calculate hours
            const punchIn = new Date(userAttendance.punch_in);
            const punchOut = new Date(punch.punch_time);
            const hours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60);
            userAttendance.total_hours = Math.round(hours * 100) / 100;
            userAttendance.status = 'present';
          }
        });

        return Array.from(attendanceMap.values());
      } catch (error) {
        console.error('Error fetching attendance:', error);
        return [];
      }
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="default">Present</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'h:mm a');
  };

  const exportAttendance = () => {
    // CSV export functionality
    const csv = [
      ['Employee', 'Department', 'Status', 'Punch In', 'Punch Out', 'Total Hours'],
      ...(attendanceData || []).map((record: any) => [
        `${record.user?.first_name} ${record.user?.last_name}`,
        record.user?.department || 'N/A',
        record.status,
        record.punch_in ? formatTime(record.punch_in) : 'N/A',
        record.punch_out ? formatTime(record.punch_out) : 'N/A',
        record.total_hours ? `${record.total_hours}h` : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Dynamic filename based on date range or single date
    const filename = useDateRange 
      ? `attendance-${format(new Date(startDate), 'yyyy-MM-dd')}-to-${format(new Date(endDate), 'yyyy-MM-dd')}.csv`
      : `attendance-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: attendanceData?.length || 0,
    present: attendanceData?.filter((d: any) => d.status === 'present').length || 0,
    partial: attendanceData?.filter((d: any) => d.status === 'partial').length || 0,
    absent: attendanceData?.filter((d: any) => d.status === 'absent').length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Attendance Tracking</h1>
        <p className="text-muted-foreground">Monitor employee and intern punch-in/punch-out records (admins excluded)</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Employees & Interns</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.partial}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {useDateRange 
                  ? `Employee & Intern Attendance: ${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`
                  : `Employee & Intern Attendance for ${format(selectedDate, 'MMMM d, yyyy')}`
                }
              </CardTitle>
              <CardDescription>
                {useDateRange 
                  ? `Attendance records for employees and interns from ${format(new Date(startDate), 'MMMM d, yyyy')} to ${format(new Date(endDate), 'MMMM d, yyyy')} (administrators excluded)`
                  : `Daily attendance records for all employees and interns (administrators excluded)`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setUseDateRange(!useDateRange)}
              >
                <Filter className="mr-2 h-4 w-4" />
                {useDateRange ? 'Single Date' : 'Date Range'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportAttendance}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
            {useDateRange ? (
              <>
                <div className="flex-1">
                  <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1">
                <Label htmlFor="single-date" className="text-sm font-medium">Select Date</Label>
                <Input
                  id="single-date"
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="mt-1"
                />
              </div>
            )}
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Clock className="h-8 w-8 animate-pulse text-muted-foreground mr-2" />
                      <span className="text-muted-foreground">Loading attendance data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : attendanceData?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No attendance records found for this date.</p>
                  </TableCell>
                </TableRow>
              ) : (
                attendanceData?.map((record: any) => (
                  <TableRow key={record.user_id}>
                    <TableCell className="font-medium">
                      {record.user?.first_name} {record.user?.last_name}
                    </TableCell>
                    <TableCell>{record.user?.department || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      {record.punch_in ? formatTime(record.punch_in) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.punch_out ? formatTime(record.punch_out) : '-'}
                    </TableCell>
                    <TableCell>
                      {record.total_hours ? `${record.total_hours}h` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
