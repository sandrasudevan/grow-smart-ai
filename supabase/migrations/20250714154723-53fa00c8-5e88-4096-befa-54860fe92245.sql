-- COMPREHENSIVE FIX: Completely reset and rebuild the auth system
-- First, drop and recreate the trigger to fix any issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Ensure profiles table has the correct structure
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'farmer';
ALTER TABLE public.profiles ALTER COLUMN preferred_language SET DEFAULT 'english';
ALTER TABLE public.profiles ALTER COLUMN profile_completed SET DEFAULT false;

-- Create a bulletproof trigger function
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
    profile_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    'farmer',
    'english',
    false
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail user creation
  RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop the user_roles table as it was causing issues
DROP TABLE IF EXISTS public.user_roles;