import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ProfileForm } from '../components/ProfileForm';
import { ProfileEditor } from '../components/ProfileEditor';
import { motion } from 'framer-motion';

export function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'info' | 'canvas'>('info');
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
      <div className="mt-24 pb-8 px-4 max-w-4xl mx-auto w-full">
        {/* Tabs */}
        <motion.div 
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99]
          }}
        >
          <div className="glossy p-1 rounded-xl flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'info' 
                  ? 'bg-white/20 text-sky-900' 
                  : 'text-sky-900/70 hover:text-sky-900'
              }`}
            >
              Información de Perfil
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'canvas' 
                  ? 'bg-white/20 text-sky-900' 
                  : 'text-sky-900/70 hover:text-sky-900'
              }`}
            >
              Editor de Canvas
            </button>
          </div>
        </motion.div>
        
        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: 0.2,
            ease: [0.6, -0.05, 0.01, 0.99]
          }}
        >
          {activeTab === 'info' ? (
            <ProfileForm userId={userId} />
          ) : (
            <ProfileEditor userId={userId} isOwner={true} />
          )}
        </motion.div>
      </div>
    </div>
  );
}