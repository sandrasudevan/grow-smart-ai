import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if language selection is completed
      const selectedLanguage = localStorage.getItem('selectedLanguage');
      const literacyStatus = localStorage.getItem('literacyStatus');
      
      if (!selectedLanguage) {
        navigate('/language-selection', { replace: true });
        return;
      }

      // If illiterate, go to voice chat (no authentication needed)
      if (literacyStatus === 'illiterate') {
        navigate('/voice-chat', { replace: true });
        return;
      }

      // If literate but not authenticated, go to auth page
      if (!user) {
        navigate('/auth', { replace: true });
        return;
      }

      // If authenticated but profile not completed, go to profile setup
      if (user && (!profile || !profile.profile_completed)) {
        navigate('/profile-setup', { replace: true });
        return;
      }

      // If everything is completed, go to dashboard
      if (user && profile?.profile_completed) {
        navigate('/dashboard', { replace: true });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Setting up your experience...</p>
        </div>
      </div>
    );
  }

  // Immediate redirects without loading state
  const selectedLanguage = localStorage.getItem('selectedLanguage');
  const literacyStatus = localStorage.getItem('literacyStatus');

  if (!selectedLanguage) {
    return <Navigate to="/language-selection" replace />;
  }

  if (literacyStatus === 'illiterate') {
    return <Navigate to="/voice-chat" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user && (!profile || !profile.profile_completed)) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};