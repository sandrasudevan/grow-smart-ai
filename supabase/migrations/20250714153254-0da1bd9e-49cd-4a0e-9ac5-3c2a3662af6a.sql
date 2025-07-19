-- Fix the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_role_val user_role;
  user_lang_val preferred_language;
BEGIN
  -- Safely extract and validate role
  BEGIN
    user_role_val := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer');
  EXCEPTION WHEN OTHERS THEN
    user_role_val := 'farmer';
  END;
  
  -- Safely extract and validate language
  BEGIN
    user_lang_val := COALESCE((NEW.raw_user_meta_data->>'preferred_language')::preferred_language, 'english');
  EXCEPTION WHEN OTHERS THEN
    user_lang_val := 'english';
  END;

  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, full_name, role, preferred_language)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role_val,
    user_lang_val
  );
  
  -- Insert into user_roles table (with error handling)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role_val);
  EXCEPTION WHEN unique_violation THEN
    -- Role already exists, ignore
    NULL;
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to insert user role: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If profile creation fails, log error and still allow user creation
  RAISE WARNING 'Failed to create user profile: %', SQLERRM;
  RETURN NEW;
END;
$function$;