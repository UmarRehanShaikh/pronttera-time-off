import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CalendarDays, 
  CheckCircle, 
  Users, 
  BarChart3,
  Shield,
  Clock
} from 'lucide-react';

export function LandingPage() {
  const features = [
    {
      icon: CalendarDays,
      title: 'Quarterly Leave Tracking',
      description: '5 leaves credited every quarter with automatic balance management',
    },
    {
      icon: CheckCircle,
      title: 'Easy Approvals',
      description: 'Streamlined approval workflow for managers with one-click actions',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Complete visibility for managers and admins with team calendars',
    },
    {
      icon: BarChart3,
      title: 'Comprehensive Reports',
      description: 'Export yearly reports in CSV format for compliance',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Role-based access with complete audit trail',
    },
    {
      icon: Clock,
      title: 'Year-End Carry Forward',
      description: '50% of unused leaves automatically carried to next year',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
              P
            </div>
            <span className="text-xl font-semibold">PLMS</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Pronttera Leave
          <br />
          <span className="text-primary">Management System</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Streamline your organization's leave management with quarterly tracking,
          automated carry-forwards, and a seamless approval workflow.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/signup">Start Free Trial</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Everything You Need
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          A complete leave management solution built for modern organizations
        </p>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-24">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to streamline your leave management?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join organizations that trust PLMS for their leave tracking needs.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/signup">Get Started Today</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Pronttera. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
