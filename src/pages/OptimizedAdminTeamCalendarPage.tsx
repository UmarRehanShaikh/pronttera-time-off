import OptimizedTeamCalendar from '@/components/OptimizedTeamCalendar';

export default function OptimizedAdminTeamCalendarPage() {
  return (
    <OptimizedTeamCalendar 
      viewType="team" 
      title="Team Calendar"
      description="View team leave requests, holidays, and optional holidays"
    />
  );
}
