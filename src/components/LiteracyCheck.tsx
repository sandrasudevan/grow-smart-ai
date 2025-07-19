import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getTranslation } from '@/utils/translations';

interface LiteracyCheckProps {
  selectedLanguage: string;
  onLiteracySelect: (isLiterate: boolean) => void;
}

export const LiteracyCheck: React.FC<LiteracyCheckProps> = ({ selectedLanguage, onLiteracySelect }) => {
  const translation = getTranslation(selectedLanguage);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 text-center shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-6 shadow-lg">
            <span className="text-white text-2xl">📖</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
            {translation.title}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {translation.question} <span className="font-bold text-green-600">{translation.languageName}</span>?
          </p>
        </div>
        
        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full h-16 text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => onLiteracySelect(true)}
          >
            {translation.yesButton}
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="w-full h-16 text-lg border-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-300"
            onClick={() => onLiteracySelect(false)}
          >
            {translation.noButton}
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          {translation.description}
        </p>
      </Card>
    </div>
  );
};