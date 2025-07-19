import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LanguageSelectionProps {
  onLanguageSelect: (language: string) => void;
}

const languages = [
  { code: 'english', name: 'English', nativeName: 'English', flag: 'US', flagEmoji: '🇺🇸' },
  { code: 'hindi', name: 'Hindi', nativeName: 'हिंदी', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'tamil', name: 'Tamil', nativeName: 'தமிழ்', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'telugu', name: 'Telugu', nativeName: 'తెలుగు', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'kannada', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'marathi', name: 'Marathi', nativeName: 'मराठी', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'gujarati', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'bengali', name: 'Bengali', nativeName: 'বাংলা', flag: 'BD', flagEmoji: '🇧🇩' },
  { code: 'punjabi', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'malayalam', name: 'Malayalam', nativeName: 'മലയാളം', flag: 'IN', flagEmoji: '🇮🇳' },
  { code: 'spanish', name: 'Spanish', nativeName: 'Español', flag: 'ES', flagEmoji: '🇪🇸' },
  { code: 'portuguese', name: 'Portuguese', nativeName: 'Português', flag: 'PT', flagEmoji: '🇵🇹' },
  { code: 'japanese', name: 'Japanese', nativeName: '日本語', flag: 'JP', flagEmoji: '🇯🇵' },
  { code: 'indonesian', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: 'ID', flagEmoji: '🇮🇩' },
];

export const LanguageSelection: React.FC<LanguageSelectionProps> = ({ onLanguageSelect }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-6 shadow-lg">
            <span className="text-white text-3xl font-bold">🌱</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Welcome to Grow Smart AI
          </h1>
          <p className="text-xl text-gray-600 font-medium">Please select your preferred language</p>
          <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto mt-4 rounded-full"></div>
        </div>
        
        {/* Language Grid */}
        <Card className="p-8 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
            {languages.map((language) => (
              <Button
                key={language.code}
                variant="outline"
                className="h-24 md:h-28 flex flex-col items-center justify-center space-y-2 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 hover:border-green-300 hover:shadow-md transition-all duration-300 group border-gray-200 bg-white/70 backdrop-blur-sm"
                onClick={() => onLanguageSelect(language.code)}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xl group-hover:scale-110 transition-transform duration-200">
                    {language.flagEmoji}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {language.flag}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold text-gray-800 group-hover:text-green-700 transition-colors">
                    {language.name}
                  </span>
                  <span className="block text-sm text-gray-600 group-hover:text-green-600 transition-colors font-medium">
                    {language.nativeName}
                  </span>
                </div>
              </Button>
            ))}
          </div>
          
          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              🌾 Your intelligent farming companion in your preferred language
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};