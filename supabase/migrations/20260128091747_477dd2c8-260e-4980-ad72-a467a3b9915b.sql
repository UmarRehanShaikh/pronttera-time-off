-- Create public_holidays table
CREATE TABLE public.public_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, year)
);

-- Enable RLS
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;

-- Anyone can view public holidays
CREATE POLICY "Anyone can view public holidays"
ON public.public_holidays
FOR SELECT
USING (true);

-- Only admins can manage public holidays
CREATE POLICY "Admins can manage public holidays"
ON public.public_holidays
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Add index for year-based queries
CREATE INDEX idx_public_holidays_year ON public.public_holidays(year);