-- Check if the trigger exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger 
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also make sure the profiles table user_id column is not constrained in a way that blocks inserts
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;