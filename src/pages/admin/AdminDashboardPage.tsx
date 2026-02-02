import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Calendar, CheckCircle, TrendingUp, UserPlus, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  approvedLeaves: number;
  totalDepartments: number;
  recentLeaves: any[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    approvedLeaves: 0,
    totalDepartments: 0,
    recentLeaves: []
  });

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      try {
        // Get all profiles and user roles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('is_active, department, user_id');

        if (profilesError) throw profilesError;

        // Get user roles to filter out admins
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) throw rolesError;

        // Filter out admin users
        const adminUserIds = userRoles?.filter(ur => ur.role === 'admin').map(ur => ur.user_id) || [];
        const employeeProfiles = profiles?.filter(p => !adminUserIds.includes(p.user_id)) || [];

        // Get leave statistics (all users including admins)
        const { data: leaves, error: leavesError } = await supabase
          .from('leave_requests')
          .select('status, start_date, end_date, days')
          .order('created_at', { ascending: false })
          .limit(10);

        if (leavesError) throw leavesError;

        // Calculate statistics (excluding admins)
        const totalEmployees = employeeProfiles.length;
        const activeEmployees = employeeProfiles.filter(p => p.is_active).length;
        const pendingLeaves = leaves?.filter(l => l.status === 'pending').length || 0;
        const approvedLeaves = leaves?.filter(l => l.status === 'approved').length || 0;
        
        // Get unique departments (excluding admins)
        const departments = new Set(employeeProfiles.map(p => p.department).filter(Boolean));
        const totalDepartments = departments.size;

        // Get recent approved leaves
        const recentLeaves = leaves?.filter(l => l.status === 'approved').slice(0, 5) || [];

        return {
          totalEmployees,
          activeEmployees,
          pendingLeaves,
          approvedLeaves,
          totalDepartments,
          recentLeaves
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
  });

  useEffect(() => {
    if (dashboardData) {
      setStats(dashboardData);
    }
  }, [dashboardData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of your organization</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your organization</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.totalEmployees}</div>
            <p className="text-xs text-blue-600 mt-1">
              {stats.activeEmployees} active (excluding admins)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.approvedLeaves}</div>
            <p className="text-xs text-green-600 mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pending Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{stats.pendingLeaves}</div>
            <p className="text-xs text-yellow-600 mt-1">
              Need approval
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.totalDepartments}</div>
            <p className="text-xs text-purple-600 mt-1">
              Active departments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/users">
              <Button className="w-full justify-start" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New User
              </Button>
            </Link>
            <Link to="/admin/leave-management">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Manage Leaves
              </Button>
            </Link>
            <Link to="/pending">
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" />
                Review Pending Requests
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Approved Leaves */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Recent Approved Leaves
            </CardTitle>
            <CardDescription>
              Latest approved leave requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentLeaves.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No approved leaves found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentLeaves.map((leave, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Approved
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">
                          {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {leave.days} day{leave.days > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link to="/admin/leave-management">
                  <Button variant="outline" className="w-full">
                    View All Leaves
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Overview
          </CardTitle>
          <CardDescription>
            Current workforce statistics (excluding administrators)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.totalEmployees}</div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.activeEmployees}</div>
              <p className="text-sm text-muted-foreground">Active Employees</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{stats.totalDepartments}</div>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
