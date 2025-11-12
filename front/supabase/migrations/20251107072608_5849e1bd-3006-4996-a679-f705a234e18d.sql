-- Add star_fragments column to user_powder table
ALTER TABLE public.user_powder 
ADD COLUMN star_fragments integer DEFAULT 0;

-- Create weekly_rankings table for tracking weekly activity
CREATE TABLE public.weekly_rankings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    total_exp integer NOT NULL DEFAULT 0,
    rank integer,
    reward_garu integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id, week_start)
);

-- Enable RLS on weekly_rankings
ALTER TABLE public.weekly_rankings ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_rankings
CREATE POLICY "Anyone can view rankings"
ON public.weekly_rankings
FOR SELECT
USING (true);

CREATE POLICY "System can insert rankings"
ON public.weekly_rankings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update rankings"
ON public.weekly_rankings
FOR UPDATE
USING (true);

-- Create index for better query performance
CREATE INDEX idx_weekly_rankings_week ON public.weekly_rankings(week_start, week_end);
CREATE INDEX idx_weekly_rankings_rank ON public.weekly_rankings(week_start, rank);

-- Create upgrade_logs table to track upgrade attempts
CREATE TABLE public.upgrade_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    current_stars integer NOT NULL,
    success boolean NOT NULL,
    fragments_gained integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on upgrade_logs
ALTER TABLE public.upgrade_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for upgrade_logs
CREATE POLICY "Users can view their own upgrade logs"
ON public.upgrade_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upgrade logs"
ON public.upgrade_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);