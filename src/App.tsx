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

  if (!session) {
    return <AuthScreen onAuthSuccess={() => setSession(true)} />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex flex-col">
      <Header unreadChats={3} userEmail={userEmail} />
      <Outlet />
    </div>
  );
}