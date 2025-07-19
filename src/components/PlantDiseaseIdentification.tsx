import { EmbeddedToolWrapper } from '@/components/EmbeddedToolWrapper';
import { Bug } from "lucide-react";

export function PlantDiseaseIdentification() {
  return (
    <EmbeddedToolWrapper
      src="https://v0-plant-disease-detector-seven.vercel.app/"
      title="Plant Disease Detection"
      description="Advanced AI-powered disease identification and treatment recommendations"
      category="Disease Management"
      icon={Bug}
      farmingUseCase="Identify plant diseases early, get treatment recommendations, and prevent crop loss"
    />
  );
}