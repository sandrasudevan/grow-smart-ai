-- Enable realtime for community tables
ALTER publication supabase_realtime ADD TABLE community_posts;
ALTER publication supabase_realtime ADD TABLE post_comments;
ALTER publication supabase_realtime ADD TABLE expert_network;

-- Create enhanced community features tables
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'solved', 'bookmark')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE TABLE public.comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'disagree')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

CREATE TABLE public.user_reputation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  posts_count INTEGER NOT NULL DEFAULT 0,
  helpful_answers INTEGER NOT NULL DEFAULT 0,
  best_answers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

CREATE TABLE public.community_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  crop_type TEXT,
  region TEXT,
  created_by UUID NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('webinar', 'field_day', 'workshop', 'consultation')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_online BOOLEAN NOT NULL DEFAULT false,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  group_id UUID REFERENCES community_groups(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE public.expert_consultations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID NOT NULL REFERENCES expert_network(id),
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  consultation_type TEXT NOT NULL CHECK (consultation_type IN ('chat', 'video', 'field_visit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.consultation_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES expert_consultations(id),
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their reactions" ON public.post_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view all reactions" ON public.post_reactions FOR SELECT USING (true);

CREATE POLICY "Users can manage their comment reactions" ON public.comment_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view all comment reactions" ON public.comment_reactions FOR SELECT USING (true);

CREATE POLICY "Users can view all reputation" ON public.user_reputation FOR SELECT USING (true);
CREATE POLICY "Users can update their reputation" ON public.user_reputation FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage reputation" ON public.user_reputation FOR ALL USING (true);

CREATE POLICY "Users can view all badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can award badges" ON public.user_badges FOR ALL USING (true);

CREATE POLICY "Users can view public groups" ON public.community_groups FOR SELECT USING (is_private = false OR auth.uid() = created_by OR EXISTS(SELECT 1 FROM group_members WHERE group_id = community_groups.id AND user_id = auth.uid()));
CREATE POLICY "Users can create groups" ON public.community_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update groups" ON public.community_groups FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can view group memberships" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view events" ON public.community_events FOR SELECT USING (true);
CREATE POLICY "Users can create events" ON public.community_events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Event creators can update events" ON public.community_events FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can manage event participation" ON public.event_participants FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Event creators can view participants" ON public.event_participants FOR SELECT USING (EXISTS(SELECT 1 FROM community_events WHERE id = event_participants.event_id AND created_by = auth.uid()));

CREATE POLICY "Users can view their consultations" ON public.expert_consultations FOR SELECT USING (auth.uid() = client_id OR EXISTS(SELECT 1 FROM expert_network WHERE id = expert_consultations.expert_id AND user_id = auth.uid()));
CREATE POLICY "Users can book consultations" ON public.expert_consultations FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Experts can update consultations" ON public.expert_consultations FOR UPDATE USING (EXISTS(SELECT 1 FROM expert_network WHERE id = expert_consultations.expert_id AND user_id = auth.uid()));

CREATE POLICY "Users can view public reviews" ON public.consultation_reviews FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create reviews" ON public.consultation_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can view their messages" ON public.direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their received messages" ON public.direct_messages FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view post media" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "Post authors can add media" ON public.post_media FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM community_posts WHERE id = post_media.post_id AND user_id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public.user_reputation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_groups_updated_at BEFORE UPDATE ON public.community_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_community_events_updated_at BEFORE UPDATE ON public.community_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expert_consultations_updated_at BEFORE UPDATE ON public.expert_consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for new tables
ALTER publication supabase_realtime ADD TABLE post_reactions;
ALTER publication supabase_realtime ADD TABLE comment_reactions;
ALTER publication supabase_realtime ADD TABLE user_reputation;
ALTER publication supabase_realtime ADD TABLE community_groups;
ALTER publication supabase_realtime ADD TABLE direct_messages;
ALTER publication supabase_realtime ADD TABLE expert_consultations;