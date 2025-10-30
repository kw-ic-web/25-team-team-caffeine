-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Create goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  progress INT DEFAULT 0,
  difficulty INT DEFAULT 1,
  powder_reward INT DEFAULT 100,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
ON public.goals FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own goals"
ON public.goals FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own goals"
ON public.goals FOR UPDATE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own goals"
ON public.goals FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Create pets table
CREATE TABLE public.pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  level INT DEFAULT 1,
  rarity TEXT DEFAULT 'common',
  experience INT DEFAULT 0,
  stars INT DEFAULT 0,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pets"
ON public.pets FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own pets"
ON public.pets FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own pets"
ON public.pets FOR UPDATE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own pets"
ON public.pets FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Create user_powder table to track powder balance
CREATE TABLE public.user_powder (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  amount INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_powder ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own powder"
ON public.user_powder FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own powder"
ON public.user_powder FOR UPDATE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own powder"
ON public.user_powder FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
ON public.calendar_events FOR SELECT
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own events"
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own events"
ON public.calendar_events FOR UPDATE
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own events"
ON public.calendar_events FOR DELETE
USING (auth.uid()::text = user_id::text);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_powder_updated_at BEFORE UPDATE ON public.user_powder FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', '모험가'));
  
  INSERT INTO public.user_powder (user_id, amount)
  VALUES (NEW.id, 1250);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();