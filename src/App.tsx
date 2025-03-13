import React, { useEffect, useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { supabase } from './lib/supabase';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';

export default function App() {
  const [session, setSession] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || '');
      }
      setSession(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email || '');
      }
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

  if (!session) {
    return <AuthScreen onAuthSuccess={() => setSession(true)} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden text-cyan-100" style={{ backgroundColor: '#0c2a4a' }}>
      {/* Video Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-full md:w-4/5 lg:w-3/4 max-w-5xl" style={{ maxHeight: '80vh' }}>
          {/* Gradient overlay to help with transition */}
          <div className="absolute inset-0 bg-[#0c2a4a] opacity-30 z-10"></div>
          
          {/* Video with fade effect */}
          <video
            autoPlay
            loop
            muted
            className="w-full h-full object-contain opacity-70 shadow-none"
            style={{ 
              maskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
              boxShadow: 'none'
            }}
          >
            <source src="/hallword_background.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
      
      {/* Content overlay with cyan accent colors */}
      <div className="min-h-screen relative z-20 flex flex-col">
        <Header unreadChats={0} userEmail={userEmail} />
        <Outlet />
      </div>
    </div>
  );
}