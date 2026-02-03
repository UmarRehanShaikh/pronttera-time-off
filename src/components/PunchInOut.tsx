import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PunchRecord, PunchStatus } from '@/lib/types';
import { format } from 'date-fns';

interface PunchInOutProps {
  onPunchComplete?: () => void;
}

export function PunchInOut({ onPunchComplete }: PunchInOutProps) {
  const { profile } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<'in' | 'out' | null>(null);
  const [lastPunch, setLastPunch] = useState<PunchRecord | null>(null);

  // Get today's punch records - with error handling for missing table
  const { data: todayPunches, isLoading, error } = useQuery({
    queryKey: ['today-punches', profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      
      try {
        const today = new Date().toISOString().split('T')[0];
        // Using 'any' to bypass TypeScript error until database table is created
        const { data, error } = await (supabase as any)
          .from('punch_records')
          .select('*')
          .eq('user_id', profile.user_id)
          .gte('punch_time', today)
          .order('punch_time', { ascending: false });

        if (error?.message?.includes('does not exist')) {
          console.log('punch_records table not found, returning empty array');
          return [];
        }
        
        if (error) throw error;
        return data as PunchRecord[];
      } catch (err) {
        console.error('Error fetching punch records:', err);
        return [];
      }
    },
    enabled: !!profile?.user_id,
  });

  // Determine current status
  useEffect(() => {
    if (todayPunches && todayPunches.length > 0) {
      const latestPunch = todayPunches[0];
      setLastPunch(latestPunch);
      setCurrentStatus(latestPunch.punch_type === 'in' ? 'in' : 'out');
    } else {
      setCurrentStatus('out'); // Default to out if no punches today
      setLastPunch(null);
    }
  }, [todayPunches]);

  // Punch in/out mutation
  const punchMutation = useMutation({
    mutationFn: async (punchType: PunchStatus) => {
      if (!profile?.id) throw new Error('User not found');

      try {
        // Check if user has a profile record
        const { data: profileCheck, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', profile.user_id)
          .single();

        if (profileError?.code === 'PGRST116') {
          throw new Error('Profile not found. Please contact administrator to set up your employee profile.');
        }

        if (profileError) throw profileError;

        // Using 'any' to bypass TypeScript error until database table is created
        const { data, error } = await (supabase as any)
          .from('punch_records')
          .insert({
            user_id: profile.user_id,
            punch_type: punchType,
            punch_time: new Date().toISOString(),
            location: 'Office', // Could be enhanced with geolocation
            notes: null,
            ip_address: null, // Could be enhanced with IP detection
          })
          .select()
          .single();

        if (error?.message?.includes('does not exist')) {
          throw new Error('Punch records table not found. Please contact administrator.');
        }

        if (error?.code === '23503') {
          throw new Error('Profile mismatch. Please contact administrator to fix your employee record.');
        }

        if (error) throw error;
        return data as PunchRecord;
      } catch (err) {
        console.error('Punch mutation error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      setCurrentStatus(data.punch_type);
      setLastPunch(data);
      if (onPunchComplete) {
        onPunchComplete();
      }
    },
    onError: (error: any) => {
      // Show user-friendly error message
      console.error('Punch error:', error);
    },
  });

  const handlePunch = () => {
    const nextPunchType = currentStatus === 'in' ? 'out' : 'in';
    punchMutation.mutate(nextPunchType);
  };

  const formatTime = (timeString: string) => {
    return format(new Date(timeString), 'h:mm a');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in': return 'default';
      case 'out': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in': return 'Clocked In';
      case 'out': return 'Clocked Out';
      default: return 'No Record';
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-pulse text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Loading attendance status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Time Tracking
        </CardTitle>
        <CardDescription>
          Punch in and out to track your work hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              currentStatus === 'in' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Clock className={`h-5 w-5 ${
                currentStatus === 'in' ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <p className="font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">
                {lastPunch ? `Last punch: ${formatTime(lastPunch.punch_time)}` : 'No punches today'}
              </p>
            </div>
          </div>
          <Badge variant={getStatusColor(currentStatus || 'outline') as any}>
            {getStatusText(currentStatus || 'outline')}
          </Badge>
        </div>

        {/* Punch Button */}
        <Button 
          onClick={handlePunch}
          disabled={punchMutation.isPending}
          className="w-full"
          size="lg"
          variant={currentStatus === 'in' ? 'destructive' : 'default'}
        >
          {punchMutation.isPending ? (
            <>
              <Activity className="mr-2 h-4 w-4 animate-pulse" />
              Processing...
            </>
          ) : (
            <>
              {currentStatus === 'in' ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Punch Out
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Punch In
                </>
              )}
            </>
          )}
        </Button>

        {/* Today's Punch History */}
        {todayPunches && todayPunches.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Today's Activity</h4>
            <div className="space-y-2">
              {todayPunches.slice(0, 5).map((punch) => (
                <div key={punch.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${
                      punch.punch_type === 'in' ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className="text-sm font-medium">
                      {punch.punch_type === 'in' ? 'Punched In' : 'Punched Out'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatTime(punch.punch_time)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            How it works:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Click "Punch In" when you start working</li>
            <li>• Click "Punch Out" when you finish working</li>
            <li>• Your work hours are automatically calculated</li>
            <li>• Admin can view all attendance records</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
