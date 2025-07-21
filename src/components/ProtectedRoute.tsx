import React from 'react';
import { Navigate, useRouter } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * A component that protects routes by checking if the user is authenticated.
 * If the user is not authenticated, they are redirected to the login page.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    // Store the intended destination to redirect back after login
    const currentPath = router.state.location.pathname;
    return <Navigate to="/" search={{ redirect: currentPath }} />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;