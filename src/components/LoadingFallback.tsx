import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

export const LoadingFallback: React.FC<{ 
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
}> = ({ 
  message = "Loading...", 
  timeout = 10000,
  onTimeout
}) => {
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
      onTimeout?.();
    }, timeout);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [timeout, onTimeout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="text-center space-y-4 p-6">
        {!isTimedOut ? (
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
        ) : (
          <div className="h-8 w-8 mx-auto text-red-500">⚠️</div>
        )}
        
        <div className="space-y-2">
          <p className="text-gray-700 font-medium">
            {isTimedOut ? "Taking longer than expected..." : message}
          </p>
          
          {!isOnline && (
            <div className="flex items-center justify-center gap-2 text-orange-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">You appear to be offline</span>
            </div>
          )}
          
          {isTimedOut && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                This might be due to a slow connection or server issue.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                Try refreshing the page
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};