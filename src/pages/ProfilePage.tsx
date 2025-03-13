import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ProfileForm } from '../components/ProfileForm';
import { ProfileEditor } from '../components/ProfileEditor';
import { motion } from 'framer-motion';
import { UserCircle, PaintBucket } from 'lucide-react';

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
      className="min-h-screen flex flex-col fixed inset-0 overflow-auto bg-gradient-to-b from-cyan-900 via-blue-950 to-indigo-950"
    >
      <Header unreadChats={3} userEmail={userEmail} />
      
      <div className="mt-24 pb-12 px-4 max-w-4xl mx-auto w-full relative z-10">
        {/* Decorative elements */}
        <div className="absolute top-[-50px] right-[-80px] w-64 h-64 bg-gradient-to-br from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-[-30px] left-[-60px] w-72 h-72 bg-gradient-to-tr from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -z-10"></div>
        
        {/* Page Title */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-cyan-300 text-3xl font-bold drop-shadow-md">
            Tu Perfil Personal
          </h1>
          <p className="text-cyan-400 mt-2 max-w-md mx-auto">
            Personaliza tu información y crea tu espacio único
          </p>
        </motion.div>
        
        {/* Tabs */}
        <motion.div 
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            ease: [0.6, -0.05, 0.01, 0.99]
          }}
        >
          <div className="relative overflow-hidden rounded-xl p-1.5 flex shadow-lg bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20">
            {/* Prismatic edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
            
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'info' 
                  ? 'bg-cyan-800/50 text-cyan-300 shadow-sm' 
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-800/30'
              }`}
            >
              <UserCircle size={18} />
              <span>Información de Perfil</span>
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'canvas' 
                  ? 'bg-cyan-800/50 text-cyan-300 shadow-sm' 
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-800/30'
              }`}
            >
              <PaintBucket size={18} />
              <span>Editor de Canvas</span>
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
          className="relative"
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