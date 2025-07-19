-- Phase 1: Complete Database Schema Enhancement
-- Drop existing problematic policies to rebuild them properly
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Ensure the trigger exists and is working
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Insert basic profile - no complex operations that can fail
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    role, 
    preferred_language, 
    profile_completed,
    sms_notifications,
    email_notifications,
    app_notifications
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    'farmer',
    'english',
    false,
    true,
    true,
    true
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail user creation
  RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add proper RLS policies with better logic
CREATE POLICY "Enable read access for own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed ON public.profiles(profile_completed);

-- Create a function to get user profile safely
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  role user_role,
  preferred_language preferred_language,
  profile_completed boolean,
  district text,
  state text,
  crop_types crop_type[],
  soil_type soil_type,
  region_type region_type,
  sms_notifications boolean,
  email_notifications boolean,
  app_notifications boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.role,
    p.preferred_language,
    p.profile_completed,
    p.district,
    p.state,
    p.crop_types,
    p.soil_type,
    p.region_type,
    p.sms_notifications,
    p.email_notifications,
    p.app_notifications,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.user_id = p_user_id;
END;
$$;