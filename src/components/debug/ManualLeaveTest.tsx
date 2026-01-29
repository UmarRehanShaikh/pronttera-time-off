import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Hammer, CheckCircle, AlertCircle, TrendingDown } from 'lucide-react';

export function ManualLeaveTest() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  // Get current user's leave balance
  const { data: currentBalance, refetch: refetchBalance } = useQuery({
    queryKey: ['current-balance'],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get user's approved requests
  const { data: approvedRequests } = useQuery({
    queryKey: ['approved-requests'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('start_date', `${currentYear}-12-31`);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Manual leave deduction test
  const manualDeductTest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const currentYear = new Date().getFullYear();
      
      // Create or update ledger
      const { data: ledger, error: ledgerError } = await supabase
        .from('leave_ledger')
        .upsert({
          user_id: user.id,
          year: currentYear,
          q1: 5, q2: 5, q3: 5, q4: 5,
          carried_from_last_year: 0,
          optional_used: 0
        })
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // Get current quarter
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      
      // Manually deduct 1 day from current quarter
      const updateData: any = {};
      switch (currentQuarter) {
        case 1: updateData.q1 = Math.max(0, ledger.q1 - 1); break;
        case 2: updateData.q2 = Math.max(0, ledger.q2 - 1); break;
        case 3: updateData.q3 = Math.max(0, ledger.q3 - 1); break;
        case 4: updateData.q4 = Math.max(0, ledger.q4 - 1); break;
      }

      const { data: updatedLedger, error: updateError } = await supabase
        .from('leave_ledger')
        .update(updateData)
        .eq('id', ledger.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return updatedLedger;
    },
    onSuccess: (result) => {
      toast({
        title: 'Manual Deduction Successful! ✅',
        description: `Deducted 1 day from quarter ${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      });
      refetchBalance();
    },
    onError: (error) => {
      toast({
        title: 'Manual Deduction Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create and approve a test request
  const createAndApproveTest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Create a test request
      const { data: request, error: createError } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user.id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          days: 1,
          leave_type: 'general',
          reason: 'Test request - should auto-deduct',
          status: 'pending'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Approve it immediately
      const { data: approved, error: approveError } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: user.id
        })
        .eq('id', request.id)
        .select()
        .single();

      if (approveError) throw approveError;

      // Wait a moment for trigger
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if balance changed
      const currentYear = new Date().getFullYear();
      const { data: newBalance, error: balanceError } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      if (balanceError) throw balanceError;

      return {
        request: approved,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        triggerWorked: currentBalance && newBalance && 
          (currentBalance.q1 + currentBalance.q2 + currentBalance.q3 + currentBalance.q4) >
          (newBalance.q1 + newBalance.q2 + newBalance.q3 + newBalance.q4)
      };
    },
    onSuccess: (result) => {
      if (result.triggerWorked) {
        toast({
          title: '✅ Trigger Working!',
          description: 'Leave was automatically deducted on approval.',
        });
      } else {
        toast({
          title: '❌ Trigger Not Working',
          description: 'Leave was not deducted automatically. Use manual deduction.',
          variant: 'destructive',
        });
      }
      refetchBalance();
    },
    onError: (error) => {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!isAdmin) {
    return null;
  }

  const totalAvailable = currentBalance ? 
    currentBalance.q1 + currentBalance.q2 + currentBalance.q3 + currentBalance.q4 + currentBalance.carried_from_last_year : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="h-5 w-5" />
          Manual Leave Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Test manual leave deduction and trigger functionality.
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium">Current Balance:</div>
            <div className="text-2xl font-bold text-primary">{totalAvailable} days</div>
            {currentBalance && (
              <div className="text-xs text-muted-foreground">
                Q1: {currentBalance.q1} | Q2: {currentBalance.q2} | Q3: {currentBalance.q3} | Q4: {currentBalance.q4}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium">Approved Requests:</div>
            <div className="text-lg font-semibold">{approvedRequests?.length || 0}</div>
            <div className="text-xs text-muted-foreground">
              Total days: {approvedRequests?.reduce((sum, req) => sum + req.days, 0) || 0}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => manualDeductTest.mutate()}
            disabled={manualDeductTest.isPending}
            className="flex items-center gap-2"
          >
            <TrendingDown className="h-4 w-4" />
            Manual Deduct 1 Day
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => createAndApproveTest.mutate()}
            disabled={createAndApproveTest.isPending}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Test Auto Deduction
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3">
          <strong>Test Instructions:</strong>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>Click "Manual Deduct 1 Day" to test manual deduction</li>
            <li>Click "Test Auto Deduction" to test the trigger</li>
            <li>Check if balance decreases after each test</li>
            <li>If auto deduction fails, the trigger needs fixing</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
