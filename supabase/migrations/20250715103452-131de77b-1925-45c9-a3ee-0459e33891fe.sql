-- Add new languages to the preferred_language enum
ALTER TYPE preferred_language ADD VALUE 'punjabi';
ALTER TYPE preferred_language ADD VALUE 'malayalam';
ALTER TYPE preferred_language ADD VALUE 'spanish';
ALTER TYPE preferred_language ADD VALUE 'portuguese';
ALTER TYPE preferred_language ADD VALUE 'japanese';
ALTER TYPE preferred_language ADD VALUE 'indonesian';

-- Add literacy_status field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN literacy_status TEXT CHECK (literacy_status IN ('literate', 'illiterate')) DEFAULT 'literate';