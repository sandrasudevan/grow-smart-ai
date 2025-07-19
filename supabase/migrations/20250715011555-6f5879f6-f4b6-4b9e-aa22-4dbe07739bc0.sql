-- Phase 1: Complete Database Schema Enhancement

-- First, ensure we have proper enums for all required types
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('farmer', 'expert', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.preferred_language AS ENUM ('english', 'hindi', 'tamil', 'telugu', 'kannada', 'marathi', 'gujarati', 'bengali');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.crop_type AS ENUM ('rice', 'wheat', 'sugarcane', 'cotton', 'maize', 'soybean', 'pulses', 'vegetables', 'fruits', 'spices', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.soil_type AS ENUM ('clay', 'loam', 'sandy', 'red', 'black', 'alluvial', 'laterite');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.region_type AS ENUM ('rainfed', 'irrigated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for proper role management
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'farmer',
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add phone_number if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
    END IF;
    
    -- Add location if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
    END IF;
    
    -- Add farm_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'farm_type') THEN
        ALTER TABLE public.profiles ADD COLUMN farm_type TEXT;
    END IF;
    
    -- Add avatar_url if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Add last_active if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_active') THEN
        ALTER TABLE public.profiles ADD COLUMN last_active TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
    
    -- Add profile_completion_date if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_completion_date') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_completion_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create trigger to update last_active
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.last_active = now();
    
    -- Set completion date when profile is completed
    IF NEW.profile_completed = true AND OLD.profile_completed = false THEN
        NEW.profile_completion_date = now();
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_last_active ON public.profiles;
CREATE TRIGGER trigger_update_last_active
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_active();

-- Enhanced handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Insert basic profile with enhanced fields
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    role, 
    preferred_language, 
    profile_completed,
    sms_notifications,
    email_notifications,
    app_notifications,
    last_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    'farmer',
    'english',
    false,
    true,
    true,
    true,
    now()
  );
  
  -- Also add to user_roles table
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (NEW.id, 'farmer', NEW.id);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail user creation
  RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create comprehensive user stats view
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    p.user_id,
    p.full_name,
    p.role,
    p.preferred_language,
    p.profile_completed,
    p.profile_completion_date,
    p.last_active,
    p.created_at,
    array_agg(DISTINCT ur.role) as all_roles,
    COALESCE(chat_count.count, 0) as total_chats,
    COALESCE(plant_count.count, 0) as total_plant_identifications
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM public.chat_conversations 
    GROUP BY user_id
) chat_count ON chat_count.user_id = p.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as count 
    FROM public.plant_identifications 
    GROUP BY user_id
) plant_count ON plant_count.user_id = p.user_id
GROUP BY p.user_id, p.full_name, p.role, p.preferred_language, 
         p.profile_completed, p.profile_completion_date, p.last_active, 
         p.created_at, chat_count.count, plant_count.count;

-- Enable RLS on the view
ALTER VIEW public.user_stats SET (security_invoker = true);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_completed ON public.profiles(profile_completed);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_identifications_user_id ON public.plant_identifications(user_id);