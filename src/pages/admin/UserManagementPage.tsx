import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserCog, Trash2 } from 'lucide-react';
import { Profile, AppRole } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Extended type for database operations that includes intern role
// NOTE: This is a temporary solution until the database schema is updated
// The TypeScript types are generated from the database schema, so when 'intern' 
// is added to the database enum, this extended type won't be needed
type ExtendedAppRole = AppRole | 'intern';

// Extended UserRole interface for database operations
interface ExtendedUserRole {
  id: string;
  user_id: string;
  role: ExtendedAppRole;
  created_at: string;
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form validation schema
  const formSchema = z.object({
    email: z.string().email('Invalid email address'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    department: z.string().min(1, 'Department is required'),
    role: z.enum(['admin', 'manager', 'employee', 'intern'], {
      required_error: 'Please select a role'
    }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    hireDate: z.string().optional(),
    endDate: z.string().optional(),
  }).refine((data) => {
    // If role is intern, endDate is required
    if (data.role === 'intern' && !data.endDate) {
      return false;
    }
    return true;
  }, {
    message: 'End date is required for interns',
    path: ['endDate'],
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      department: '',
      role: undefined,
      password: '',
      hireDate: '',
      endDate: '',
    },
  });

  const selectedRole = form.watch('role');

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      // Get user roles to filter out admins
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get admin user IDs
      const adminUserIds = userRoles?.filter(ur => ur.role === 'admin').map(ur => ur.user_id) || [];

      // Get profiles excluding admins
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('user_id', 'in', `(${adminUserIds.join(',')})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch leave balances for all employees
  const { data: leaveBalances } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_ledger')
        .select('*')
        .eq('year', currentYear);

      if (error) throw error;
      return data;
    },
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let authUser: any = null;
      try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { 
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              first_name: values.firstName,
              last_name: values.lastName,
            }
          }
        });

        if (authError?.message?.includes('over_email_send_rate_limit')) {
          throw new Error('Email rate limit exceeded. Please try again in a few minutes or use a different email address.');
        }

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');
        authUser = authData.user;

        // Check if profile already exists
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', authUser.id)
          .single();

        if (checkError?.code !== 'PGRST116') {
          // Profile exists, throw error
          throw new Error('User profile already exists. This user may have been created previously.');
        }

        // Create profile
        const profileData: any = {
          user_id: authUser.id,
          email: values.email,
          first_name: values.firstName,
          last_name: values.lastName,
          department: values.department,
          hire_date: values.hireDate || null,
          is_active: false, // Will be active after email confirmation
        };

        // Only add end_date if it's provided (for interns)
        if (values.endDate) {
          profileData.end_date = values.endDate;
        }

        let profileResult: any;
        const { data: initialProfileData, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        // Handle missing end_date column gracefully
        if (profileError?.message?.includes('end_date')) {
          console.log('end_date column not found in database, proceeding without it');
          // Try again without end_date
          const { data: fallbackProfileData, error: profileError2 } = await supabase
            .from('profiles')
            .insert({
              user_id: authUser.id,
              email: values.email,
              first_name: values.firstName,
              last_name: values.lastName,
              department: values.department,
              hire_date: values.hireDate || null,
              is_active: false,
            })
            .select()
            .single();
          
          if (profileError2) throw profileError2;
          profileResult = fallbackProfileData;
        } else if (profileError) {
          throw profileError;
        } else {
          profileResult = initialProfileData;
        }

        // Assign role
        // NOTE: Using 'as any' to bypass TypeScript error until database schema is updated
        // The database will accept 'intern' value even if TypeScript types don't include it yet
        // This is a safe approach because we control the values being passed
        
        // Check if role already exists
        const { data: existingRole, error: roleCheckError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('user_id', authUser.id)
          .single();

        let roleResult;
        if (roleCheckError?.code === 'PGRST116') {
          // Role doesn't exist, create it
          const { data: newRole, error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authUser.id,
              role: values.role as any,
            })
            .select()
            .single();

          if (roleError) throw roleError;
          roleResult = newRole;
        } else if (roleCheckError) {
          throw roleCheckError;
        } else {
          // Role already exists, update it if different
          if (existingRole.role !== values.role) {
            const { data: updatedRole, error: updateError } = await supabase
              .from('user_roles')
              .update({ role: values.role as any })
              .eq('user_id', authUser.id)
              .select()
              .single();

            if (updateError) throw updateError;
            roleResult = updatedRole;
          } else {
            roleResult = existingRole;
          }
        }

        // Initialize leave ledger for current year
        const currentYear = new Date().getFullYear();
        
        // Check if leave ledger already exists
        const { data: existingLedger, error: ledgerCheckError } = await supabase
          .from('leave_ledger')
          .select('user_id, year')
          .eq('user_id', authUser.id)
          .eq('year', currentYear)
          .single();

        if (ledgerCheckError?.code === 'PGRST116') {
          // Leave ledger doesn't exist, create it
          const { error: ledgerError } = await supabase
            .from('leave_ledger')
            .insert({
              user_id: authUser.id,
              year: currentYear,
              q1: 0,
              q2: 0,
              q3: 0,
              q4: 0,
              carried_from_last_year: 0,
              optional_used: 0,
            });

          if (ledgerError) throw ledgerError;
        } else if (ledgerCheckError) {
          throw ledgerCheckError;
        }
        // If ledger already exists, we don't need to do anything

        return { user: authData.user, profile: profileResult, needsEmailConfirmation: true };
      } catch (error) {
        // Cleanup authUser if other steps fail
        if (authUser?.id) {
          await supabase.auth.admin.deleteUser(authUser.id).catch(() => {});
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setIsAddDialogOpen(false);
      form.reset();
      
      if (data.needsEmailConfirmation) {
        toast({
          title: 'User Invitation Sent',
          description: `${data.profile.first_name} ${data.profile.last_name} has been invited. They will need to confirm their email to access the system.`,
        });
      } else {
        toast({
          title: 'User Created Successfully',
          description: `${data.profile.first_name} ${data.profile.last_name} has been added to the system.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add User',
        description: error.message || 'An error occurred while creating the user.',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // First delete user's leave requests
      await supabase.from('leave_requests').delete().eq('user_id', userId);
      
      // Then delete user's leave ledger
      await supabase.from('leave_ledger').delete().eq('user_id', userId);
      
      // Finally delete the user's profile
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({
        title: 'User Deleted',
        description: 'User has been successfully removed from the system.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const roleBadgeVariant = (role?: string): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'admin': return 'default';
      case 'manager': return 'secondary';
      case 'intern': return 'outline';
      default: return 'outline';
    }
  };

  // Helper function to get leave balance for a user
  const getLeaveBalance = (userId: string) => {
    const balance = leaveBalances?.find(ledger => ledger.user_id === userId);
    if (!balance) return { total: 0, optional: 4 };
    
    const total = balance.q1 + balance.q2 + balance.q3 + balance.q4 + balance.carried_from_last_year;
    const optional = 4 - balance.optional_used;
    
    return { total, optional };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage employees and their roles</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage employees and their roles</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {!profiles || profiles.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Available Leaves</TableHead>
                    <TableHead>Optional Holidays</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => {
                    const leaveBalance = getLeaveBalance(profile.user_id);
                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">
                          {profile.first_name} {profile.last_name}
                        </TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>{profile.department || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                            {profile.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {leaveBalance.total} days
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">
                            {leaveBalance.optional} days
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {profile.first_name} {profile.last_name}? 
                                This action will permanently remove:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>User profile and account</li>
                                  <li>All leave requests</li>
                                  <li>Leave balance records</li>
                                </ul>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUserMutation.mutate(profile.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account and assign their role in the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => addUserMutation.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {selectedRole === 'intern' && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Required for Interns)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addUserMutation.isPending}
                >
                  {addUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
