import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IDCard from '@/components/IDCard';
import { Badge } from '@/components/ui/badge';
import { User, Building, Calendar, Mail } from 'lucide-react';

export default function IDCardPage() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ID Card</h1>
          <p className="text-muted-foreground">Your employee identification card</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Please log in to view your ID card</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate employee ID number
  const generateEmployeeId = () => {
    const userId = profile.user_id?.slice(-8) || '00000000';
    return `${userId.slice(0, 4)}-${userId.slice(4, 8)}-${profile.id?.slice(-4) || '0000'}`;
  };

  const employeeId = generateEmployeeId();
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const department = profile.department || 'Not Assigned';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ID Card</h1>
        <p className="text-muted-foreground">Your employee identification card</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ID Card */}
        <div className="lg:col-span-1">
          <div className="flex justify-center">
            <div className="id-card-wrapper">
              <IDCard
                employeeName={fullName}
                employeeEmail={profile.email}
                employeeDepartment={department}
                employeeId={employeeId}
                isActive={profile.is_active}
              />
            </div>
          </div>
        </div>

        {/* Employee Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Your basic employee details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-lg font-semibold">{fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Employee ID</label>
                  <p className="text-lg font-mono">{employeeId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="text-lg">{profile.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                      {profile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Work Information
              </CardTitle>
              <CardDescription>
                Your employment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="text-lg">{department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <p className="text-lg">Employee</p>
                </div>
                {profile.hire_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Hire Date</label>
                    <p className="text-lg">
                      {new Date(profile.hire_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Employee Since</label>
                  <p className="text-lg">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Card Information
              </CardTitle>
              <CardDescription>
                Details about your ID card
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Card Type</label>
                  <p className="text-lg">Employee ID Card</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Security Level</label>
                  <p className="text-lg">Standard Access</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Issued Date</label>
                  <p className="text-lg">
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valid Until</label>
                  <p className="text-lg">
                    {new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
