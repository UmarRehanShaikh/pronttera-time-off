import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicHoliday {
  id: string;
  year: number;
  name: string;
  date: string;
  created_at: string;
}

export interface OptionalHoliday {
  id: string;
  year: number;
  name: string;
  date: string;
  created_at: string;
}

export function usePublicHolidays(year: number) {
  return useQuery({
    queryKey: ['public-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_holidays')
        .select('*')
        .eq('year', year);

      if (error) throw error;
      return data as PublicHoliday[];
    },
  });
}

export function useOptionalHolidays(year: number) {
  return useQuery({
    queryKey: ['optional-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('optional_holidays')
        .select('*')
        .eq('year', year);

      if (error) throw error;
      return data as OptionalHoliday[];
    },
  });
}

export function useAllHolidays(year: number) {
  const publicHolidays = usePublicHolidays(year);
  const optionalHolidays = useOptionalHolidays(year);

  return {
    publicHolidays: publicHolidays.data || [],
    optionalHolidays: optionalHolidays.data || [],
    isLoading: publicHolidays.isLoading || optionalHolidays.isLoading,
    error: publicHolidays.error || optionalHolidays.error,
  };
}
