-- Create enums for the application
CREATE TYPE public.user_role AS ENUM ('farmer', 'expert', 'admin');
CREATE TYPE public.preferred_language AS ENUM ('english', 'hindi', 'tamil', 'telugu', 'kannada', 'marathi', 'gujarati', 'bengali');
CREATE TYPE public.crop_type AS ENUM ('rice', 'wheat', 'sugarcane', 'cotton', 'maize', 'soybean', 'pulses', 'vegetables', 'fruits', 'spices', 'other');
CREATE TYPE public.soil_type AS ENUM ('clay', 'loam', 'sandy', 'red', 'black', 'alluvial', 'laterite');
CREATE TYPE public.region_type AS ENUM ('rainfed', 'irrigated');

-- Extend the profiles table with new fields
ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'farmer';
ALTER TABLE public.profiles ADD COLUMN district TEXT;
ALTER TABLE public.profiles ADD COLUMN state TEXT;
ALTER TABLE public.profiles ADD COLUMN preferred_language preferred_language DEFAULT 'english';
ALTER TABLE public.profiles ADD COLUMN crop_types crop_type[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN soil_type soil_type;
ALTER TABLE public.profiles ADD COLUMN region_type region_type;
ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN sms_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN app_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN profile_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN gemini_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN kaggle_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN huggingface_api_key TEXT;

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role user_role NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID,
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can assign roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Update the handle_new_user function to include role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, preferred_language)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer'),
    COALESCE((NEW.raw_user_meta_data->>'preferred_language')::preferred_language, 'english')
  );
  
  -- Assign default role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'farmer'));
  
  RETURN NEW;
END;
$function$;