import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ProfileEditor } from '../components/ProfileEditor';

export function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: '/' });
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email || '');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate({ to: '/' });
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email || '');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!userId) return null;

  return (
    <div 
      className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-500 to-indigo-500 flex flex-col fixed inset-0"
      style={{
        backgroundImage: `
          linear-gradient(135deg, 
            rgba(56, 189, 248, 0.8),
            rgba(14, 165, 233, 0.8),
            rgba(2, 132, 199, 0.8)
          ),
          url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <Header unreadChats={3} userEmail={userEmail} />
      <div className="mt-24 pb-8">
        <ProfileEditor userId={userId} isOwner={true} />
      </div>
    </div>
  );
}