import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePendingRequests, useLeaveDecision } from '@/hooks/useLeaveRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle } from 'lucide-react';
import { LeaveRequest } from '@/lib/types';

export function PendingRequestsTable() {
  const { data: requests, isLoading } = usePendingRequests();
  const leaveDecision = useLeaveDecision();
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Debug logging
  console.log('PendingRequestsTable - requests:', requests);
  console.log('PendingRequestsTable - isLoading:', isLoading);

  const handleApprove = async (requestId: string) => {
    await leaveDecision.mutateAsync({
      requestId,
      status: 'approved',
    });
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await leaveDecision.mutateAsync({
      requestId: selectedRequest.id,
      status: 'rejected',
      rejectionReason: rejectReason,
    });
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  const openRejectDialog = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    console.log('Processing request:', request);
                    return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">
                            {request.profiles?.first_name && request.profiles?.last_name 
                              ? `${request.profiles.first_name} ${request.profiles.last_name}`
                              : `User ID: ${request.user_id?.slice(-8) || 'Unknown'}`
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.profiles?.department || 'No Department'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(new Date(request.start_date), 'MMM d')} -{' '}
                        {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{request.days}</TableCell>
                      <TableCell>
                        {request.leave_type === 'optional' ? 'Optional' : 'General'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.reason || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            disabled={leaveDecision.isPending}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectDialog(request)}
                            disabled={leaveDecision.isPending}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || leaveDecision.isPending}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
