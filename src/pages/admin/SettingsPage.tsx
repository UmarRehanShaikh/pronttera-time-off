import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure system settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leave Policy</CardTitle>
            <CardDescription>
              Configure the leave allocation rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quarterly-leaves">Quarterly Leaves</Label>
                <Input id="quarterly-leaves" type="number" defaultValue={5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carry-percentage">Carry Forward %</Label>
                <Input id="carry-percentage" type="number" defaultValue={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optional-holidays">Optional Holidays</Label>
                <Input id="optional-holidays" type="number" defaultValue={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total-optional">Total Optional Available</Label>
                <Input id="total-optional" type="number" defaultValue={7} />
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Leave Request Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify managers when a new leave request is submitted
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Approval Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify employees when their request is approved/rejected
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Balance Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send quarterly balance reminders to employees
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
