import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingFallback } from '@/components/LoadingFallback';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresProfileSetup?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresProfileSetup = false 
}) => {
  const { user, profile, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Debug info only in development

  // Set a timeout for loading to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        // Auth timeout reached
        setTimeoutReached(true);
      }
    }, 8000); // 8 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  // Show loading while auth is being determined or if we hit a timeout
  if (loading && !timeoutReached) {
    return <LoadingFallback message="Checking authentication..." />;
  }

  // If no user, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user exists but we're still waiting for profile to load
  if (user && !profile && !timeoutReached) {
    return <LoadingFallback message="Loading your profile..." />;
  }

  // If requires profile setup and profile is not completed
  if (requiresProfileSetup && profile && !profile.profile_completed) {
    return <Navigate to="/profile-setup" replace />;
  }

  // If requires profile setup but no profile exists (shouldn't happen due to trigger)
  if (requiresProfileSetup && !profile) {
    return <Navigate to="/profile-setup" replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};