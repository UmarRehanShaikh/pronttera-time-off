import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Holiday {
  id: string;
  name: string;
  date: string;
  year: number;
  created_at: string;
  type: 'public' | 'optional';
}

export function HolidayManagementPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public'
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const year = parseInt(selectedYear);
      
      // Fetch public holidays (we'll need to create this table)
      const { data: publicHolidays, error: publicError } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', year)
        .order('date');

      // Fetch optional holidays
      const { data: optionalHolidays, error: optionalError } = await supabase
        .from('optional_holidays')
        .select('*')
        .eq('year', year)
        .order('date');

      if (publicError) throw publicError;
      if (optionalError) throw optionalError;

      const allHolidays = [
        ...(publicHolidays || []).map(h => ({ ...h, type: 'public' as const })),
        ...(optionalHolidays || []).map(h => ({ ...h, type: 'optional' as const }))
      ];

      setHolidays(allHolidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to fetch holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const year = new Date(formData.date).getFullYear();
      const tableName = formData.type === 'public' ? 'public_holidays' : 'optional_holidays';

      const { error } = await supabase
        .from(tableName)
        .insert({
          name: formData.name,
          date: formData.date,
          year: year
        });

      if (error) throw error;

      toast.success('Holiday added successfully');
      setIsDialogOpen(false);
      setFormData({ name: '', date: '', type: 'public' });
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    }
  };

  const handleDelete = async (holiday: Holiday) => {
    try {
      const tableName = holiday.type === 'public' ? 'public_holidays' : 'optional_holidays';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', holiday.id);

      if (error) throw error;

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Holiday Management</h1>
          <p className="text-muted-foreground">Manage public and optional holidays</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Holiday</DialogTitle>
                <DialogDescription>
                  Add a new public or optional holiday to the calendar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Holiday Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., New Year's Day"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public Holiday</SelectItem>
                        <SelectItem value="optional">Optional Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit">Add Holiday</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Holidays - {selectedYear}
          </CardTitle>
          <CardDescription>
            List of all public and optional holidays for the selected year
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading holidays...</div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No holidays found for {selectedYear}. Add your first holiday to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{new Date(holiday.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={holiday.type === 'public' ? 'default' : 'secondary'}>
                        {holiday.type === 'public' ? 'Public' : 'Optional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(holiday)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
