import { 
  LayoutDashboard, 
  CalendarPlus, 
  History, 
  Users, 
  ClipboardCheck, 
  Calendar,
  Settings,
  FileText,
  LogOut,
  CalendarDays,
  Home
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingRequests } from '@/hooks/useLeaveRequests';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function AppSidebar() {
  const { profile, role, signOut, isAdmin, isManager } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { data: pendingRequests } = usePendingRequests();
  const pendingCount = pendingRequests?.length || 0;

  const employeeItems = [
    ...(isAdmin ? [] : [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
      { title: 'Apply Leave', url: '/apply-leave', icon: CalendarPlus },
      { title: 'Leave History', url: '/history', icon: History }
    ])
  ];

  const managerItems = [
    { title: 'Pending Requests', url: '/pending', icon: ClipboardCheck },
    { title: 'Team Calendar', url: '/team-calendar', icon: Calendar },
  ];

  const adminItems = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: Home },
    { title: 'User Management', url: '/admin/users', icon: Users },
    { title: 'Leave Management', url: '/admin/leave-management', icon: Calendar },
    { title: 'Holiday Management', url: '/admin/holidays', icon: CalendarDays },
    // { title: 'Reports', url: '/admin/reports', icon: FileText },
    { title: 'Settings', url: '/admin/settings', icon: Settings },
  ];

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return 'Employee';
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg">
            <img 
              src="/logo.png" 
              alt="Pronttera Connect" 
              className="h-8 w-8 object-contain"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Pronttera Connect</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {employeeItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {employeeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-2"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(isManager || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel>Manager</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-2"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.title === 'Pending Requests' && pendingCount > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        className="flex items-center gap-2"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.first_name} {profile?.last_name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {getRoleBadge()}
              </span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut}
            className="h-8 w-8 shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
