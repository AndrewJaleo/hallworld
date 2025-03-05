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
      className="min-h-screen flex flex-col fixed inset-0 overflow-auto"
      style={{
        backgroundImage: `
          linear-gradient(135deg, 
            rgba(56, 189, 248, 0.9),
            rgba(14, 165, 233, 0.85),
            rgba(2, 132, 199, 0.8)
          ),
          url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Header unreadChats={3} userEmail={userEmail} />
      
      <div className="mt-24 pb-12 px-4 max-w-4xl mx-auto w-full relative z-10">
        {/* Decorative elements */}
        <div className="absolute top-[-50px] right-[-80px] w-64 h-64 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-[-30px] left-[-60px] w-72 h-72 bg-gradient-to-tr from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl -z-10"></div>
        
        {/* Page Title */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-white text-3xl font-bold drop-shadow-md">
            Tu Perfil Personal
          </h1>
          <p className="text-white/80 mt-2 max-w-md mx-auto">
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
          <div className="glossy p-1.5 rounded-xl flex shadow-lg">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'info' 
                  ? 'bg-white/30 text-gray-900 shadow-sm' 
                  : 'text-gray-800 hover:text-gray-900 hover:bg-white/10'
              }`}
            >
              <UserCircle size={18} />
              <span>Información de Perfil</span>
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'canvas' 
                  ? 'bg-white/30 text-gray-900 shadow-sm' 
                  : 'text-gray-800 hover:text-gray-900 hover:bg-white/10'
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