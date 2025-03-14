import React, { useEffect, useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { supabase } from './lib/supabase';
import { AuthScreen } from './components/AuthScreen';

/**
 * App - Root component that handles authentication state
 * and provides global styles
 */
export default function App() {
  const [session, setSession] = useState<boolean>(false);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Add global styles for cyan theme
  useEffect(() => {
    // Add a style element to the document head
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      a, button { color: #22d3ee; }
      a:hover, button:hover { color: #67e8f9; }
      h1, h2, h3, h4, h5, h6 { color: #a5f3fc; }
    `;
    document.head.appendChild(styleElement);

    // Clean up function to remove the style element when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Show auth screen if not authenticated
  if (!session) {
    return <AuthScreen onAuthSuccess={() => setSession(true)} />;
  }

  // Render the outlet which will be the MainLayout via the router
  return <Outlet />;
}