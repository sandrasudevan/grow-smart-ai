-- Create plant diseases table with 38 disease classifications from Kaggle dataset
CREATE TABLE public.plant_diseases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plant_name TEXT,
  disease_type TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  confidence_score NUMERIC(5,2),
  severity_level TEXT DEFAULT 'moderate', -- mild, moderate, severe
  affected_parts TEXT[], -- leaves, stems, fruits, roots
  image_url TEXT,
  symptoms_detected TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disease treatments table
CREATE TABLE public.disease_treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  disease_name TEXT NOT NULL,
  treatment_type TEXT NOT NULL, -- fungicide, pesticide, cultural, biological
  treatment_name TEXT NOT NULL,
  active_ingredient TEXT,
  application_method TEXT,
  dosage TEXT,
  frequency TEXT,
  timing TEXT,
  effectiveness_rating NUMERIC(3,2), -- 1.00 to 5.00
  cost_per_treatment NUMERIC(10,2),
  organic BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disease history table for tracking treatment progress
CREATE TABLE public.disease_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  disease_id UUID NOT NULL REFERENCES public.plant_diseases(id),
  treatment_applied TEXT,
  application_date DATE,
  progress_notes TEXT,
  follow_up_image_url TEXT,
  recovery_status TEXT DEFAULT 'in_progress', -- in_progress, improved, recovered, worsened
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create regional disease alerts table
CREATE TABLE public.regional_disease_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  alert_level TEXT DEFAULT 'low', -- low, medium, high, critical
  affected_crops TEXT[],
  outbreak_description TEXT,
  prevention_measures TEXT,
  alert_date DATE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.plant_diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_disease_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plant_diseases
CREATE POLICY "Users can create their own disease identifications" 
ON public.plant_diseases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own disease identifications" 
ON public.plant_diseases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own disease identifications" 
ON public.plant_diseases 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for disease_treatments (public read access)
CREATE POLICY "Anyone can view disease treatments" 
ON public.disease_treatments 
FOR SELECT 
USING (true);

CREATE POLICY "Experts can manage treatments" 
ON public.disease_treatments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('expert', 'admin')
));

-- RLS Policies for disease_history
CREATE POLICY "Users can manage their disease history" 
ON public.disease_history 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for regional_disease_alerts
CREATE POLICY "Anyone can view regional alerts" 
ON public.regional_disease_alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Experts can create alerts" 
ON public.regional_disease_alerts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role IN ('expert', 'admin')
));

-- Create triggers for timestamp updates
CREATE TRIGGER update_plant_diseases_updated_at
  BEFORE UPDATE ON public.plant_diseases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample disease treatments data
INSERT INTO public.disease_treatments (disease_name, treatment_type, treatment_name, active_ingredient, application_method, dosage, frequency, timing, effectiveness_rating, organic) VALUES
('Tomato Late Blight', 'fungicide', 'Copper Fungicide', 'Copper sulfate', 'Foliar spray', '2-3 tablespoons per gallon', 'Every 7-10 days', 'Early morning or evening', 4.20, true),
('Tomato Early Blight', 'fungicide', 'Baking Soda Spray', 'Sodium bicarbonate', 'Foliar spray', '1 tablespoon per quart water', 'Weekly', 'Early morning', 3.50, true),
('Corn Rust', 'fungicide', 'Neem Oil', 'Azadirachtin', 'Foliar spray', 'As per label', 'Bi-weekly', 'Cool temperatures', 4.00, true),
('Wheat Stripe Rust', 'fungicide', 'Propiconazole', 'Propiconazole', 'Foliar spray', 'As per label', 'At first signs', 'Before flowering', 4.50, false),
('Rice Blast', 'fungicide', 'Tricyclazole', 'Tricyclazole', 'Foliar spray', 'As per label', 'Preventive application', 'Tillering stage', 4.30, false);

-- Insert sample regional alerts
INSERT INTO public.regional_disease_alerts (region, disease_name, alert_level, affected_crops, outbreak_description, prevention_measures, alert_date) VALUES
('North India', 'Wheat Stripe Rust', 'high', '{"wheat"}', 'Widespread stripe rust infection reported in wheat fields', 'Apply preventive fungicides and use resistant varieties', CURRENT_DATE),
('South India', 'Rice Blast', 'medium', '{"rice"}', 'Rice blast cases increasing due to humid conditions', 'Maintain proper field drainage and apply fungicides', CURRENT_DATE),
('Maharashtra', 'Cotton Bollworm', 'medium', '{"cotton"}', 'Bollworm infestation reported in cotton fields', 'Monitor fields regularly and use pheromone traps', CURRENT_DATE);