-- Create community features tables
CREATE TABLE public.expert_network (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  specialization TEXT NOT NULL,
  experience_years INTEGER,
  location TEXT,
  bio TEXT,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_consultations INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[],
  images TEXT[],
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_expert_response BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create farming analytics tables
CREATE TABLE public.farm_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_type TEXT NOT NULL,
  field_size DECIMAL(10,2),
  planting_date DATE,
  harvest_date DATE,
  expected_yield DECIMAL(10,2),
  actual_yield DECIMAL(10,2),
  investment_cost DECIMAL(10,2),
  revenue DECIMAL(10,2),
  profit DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.farm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_record_id UUID,
  activity_type TEXT NOT NULL,
  activity_date DATE NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crop calendar table
CREATE TABLE public.crop_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  crop_type TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.expert_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_calendar ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view expert profiles" ON public.expert_network FOR SELECT USING (true);
CREATE POLICY "Users can update their expert profile" ON public.expert_network FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create expert profile" ON public.expert_network FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view community posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their farm records" ON public.farm_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their farm activities" ON public.farm_activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their crop calendar" ON public.crop_calendar FOR ALL USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE public.farm_activities ADD CONSTRAINT farm_activities_farm_record_id_fkey FOREIGN KEY (farm_record_id) REFERENCES public.farm_records(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_expert_network_updated_at BEFORE UPDATE ON public.expert_network FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_farm_records_updated_at BEFORE UPDATE ON public.farm_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();