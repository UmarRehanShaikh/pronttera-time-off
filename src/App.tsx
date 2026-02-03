import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import NotFound from "./pages/NotFound";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ApplyLeavePage } from "./pages/ApplyLeavePage";
import { HistoryPage } from "./pages/HistoryPage";
import IDCardPage from "./pages/IDCardPage";
import { PendingRequestsPage } from "./pages/PendingRequestsPage";
import TeamCalendarPage from "./pages/TeamCalendarPage";
import AdminTeamCalendarPage from "./pages/AdminTeamCalendarPage";
import AdminOriginalTeamCalendarPage from "./pages/AdminOriginalTeamCalendarPage";
import { UserManagementPage } from './pages/admin/UserManagementPage';
import AttendancePage from './pages/admin/AttendancePage';
import LeaveManagementPage from './pages/admin/LeaveManagementPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import { HolidayManagementPage } from './pages/admin/HolidayManagementPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes with Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Employee Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/apply-leave" element={<ApplyLeavePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/id-card" element={<IDCardPage />} />
              <Route
                path="/team-calendar"
                element={
                  <ProtectedRoute allowedRoles={['employee', 'intern']}>
                    <TeamCalendarPage />
                  </ProtectedRoute>
                }
              />

              {/* Manager Routes */}
              <Route
                path="/pending"
                element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <PendingRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/team-calendar"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <AdminOriginalTeamCalendarPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/attendance"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AttendancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/leave-management"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <LeaveManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/holidays"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <HolidayManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
