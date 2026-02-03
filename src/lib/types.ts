// App Role Types
export type AppRole = 'admin' | 'manager' | 'employee' | 'intern';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 'general' | 'optional';

// User & Profile Types
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  manager_id: string | null;
  hire_date: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Leave Types
export interface LeaveLedger {
  id: string;
  user_id: string;
  year: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  carried_from_last_year: number;
  optional_used: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  days: number;
  leave_type: LeaveType;
  reason: string | null;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    department: string | null;
  };
  user?: Profile;
  approver?: Profile;
}

export interface OptionalHoliday {
  id: string;
  year: number;
  name: string;
  date: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// Dashboard Types
export interface LeaveBalance {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  carried: number;
  total: number;
  optionalUsed: number;
  optionalRemaining: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Punch In/Out Types
export type PunchStatus = 'in' | 'out';

export interface PunchRecord {
  id: string;
  user_id: string;
  punch_type: PunchStatus;
  punch_time: string;
  location: string | null;
  notes: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface DailyAttendance {
  date: string;
  user_id: string;
  punch_in: string | null;
  punch_out: string | null;
  total_hours: number | null;
  status: 'present' | 'absent' | 'partial';
  user?: Profile;
}

export interface AttendanceSummary {
  user_id: string;
  period_start: string;
  period_end: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  partial_days: number;
  total_hours: number;
  average_hours: number;
  user?: Profile;
}
