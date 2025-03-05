import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ProfileEditor } from '../components/ProfileEditor';
import { ProfileForm } from '../components/ProfileForm';
import { motion } from 'framer-motion';
import { UserCircle, PaintBucket, Home } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  likings: string | null;
  age: number | null;
  gender: string | null;
  avatar_url: string | null;
  biography: string | null;
}

export function ProfileViewPage() {
  const { id } = useParams({ from: '/profile/$id' });
  const navigate = useNavigate();
  
  // Current user state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Profile being viewed
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'canvas'>('info');

  // Check if current user is authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: '/' });
        return;
      }
      setCurrentUserId(session.user.id);
      setUserEmail(session.user.email || '');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate({ to: '/' });
        return;
      }
      setCurrentUserId(session.user.id);
      setUserEmail(session.user.email || '');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch profile data
  useEffect(() => {
    if (!id) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to get the basic profile info that's guaranteed to exist
        const { data: basicData, error: basicError } = await supabase
          .from('profiles')
          .select('id, email, avatar_url')
          .eq('id', id)
          .single();
        
        if (basicError) throw basicError;
        
        if (!basicData) {
          setError('Perfil no encontrado');
          setIsLoading(false);
          return;
        }
        
        // Initialize the profile with the basic data
        const profileData: Profile = {
          id: basicData.id,
          email: basicData.email,
          name: null,
          likings: null,
          age: null,
          gender: null,
          avatar_url: basicData.avatar_url,
          biography: null
        };
        
        // Try to fetch each additional field individually
        const additionalFields = ['name', 'likings', 'age', 'gender', 'biography'];
        
        for (const field of additionalFields) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select(`${field}`)
              .eq('id', id)
              .single();
            
            if (!error && data && data[field as keyof typeof data] !== null) {
              // Set the field in profileData
              (profileData as any)[field] = data[field as keyof typeof data];
            }
          } catch (fieldError) {
            console.warn(`No se pudo obtener el campo ${field}:`, fieldError);
          }
        }
        
        // Log the profile data for debugging
        console.log('Datos del perfil cargados:', profileData);
        
        setProfile(profileData);
      } catch (err) {
        console.error('Error al cargar el perfil:', err);
        setError('No se pudo cargar el perfil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // Handle sending a message to this user
  const handleSendMessage = () => {
    if (id) {
      navigate({ to: `/chat/${id}` });
    }
  };

  // If not authenticated, don't render anything
  if (!currentUserId) return null;

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
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="glossy p-8 rounded-2xl flex flex-col items-center shadow-xl">
              <div className="w-12 h-12 border-4 border-t-transparent border-gray-700 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-900 font-medium">Cargando perfil...</p>
            </div>
          </div>
        ) : error ? (
          <div className="glossy p-8 rounded-2xl text-center shadow-xl backdrop-blur-sm bg-white/20 border border-white/30">
            <p className="text-gray-900 font-medium text-xl mb-2">{error}</p>
            <p className="text-gray-800 mb-6">El perfil que estás buscando podría no existir.</p>
            <button 
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-gray-900 font-medium flex items-center gap-2 mx-auto"
            >
              <Home size={18} />
              <span>Ir a Inicio</span>
            </button>
          </div>
        ) : profile ? (
          <>
            <motion.div 
              className="glossy p-8 rounded-2xl mb-8 shadow-xl backdrop-blur-sm bg-white/20 border border-white/30"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.6, -0.05, 0.01, 0.99]
              }}
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.name || 'Perfil'} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-white/70 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center text-gray-900 text-4xl font-bold border-4 border-white/70 shadow-lg">
                      {(profile.name || profile.email.split('@')[0]).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h1 className="text-gray-900 text-3xl font-bold mb-1">
                    {profile.name || profile.email.split('@')[0]}
                  </h1>
                  <p className="text-gray-800 mb-4">{profile.email}</p>
                  
                  {currentUserId !== profile.id && (
                    <button
                      onClick={handleSendMessage}
                      className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px]"
                    >
                      Enviar Mensaje
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-white/10 p-6 rounded-xl">
                {profile.age && (
                  <div>
                    <h3 className="text-gray-800 text-sm uppercase tracking-wider mb-1">Edad</h3>
                    <p className="text-gray-900 text-lg">{profile.age}</p>
                  </div>
                )}
                
                {profile.gender && (
                  <div>
                    <h3 className="text-gray-800 text-sm uppercase tracking-wider mb-1">Género</h3>
                    <p className="text-gray-900 text-lg capitalize">
                      {profile.gender === 'male' ? 'Masculino' : 
                       profile.gender === 'female' ? 'Femenino' : 
                       profile.gender === 'non-binary' ? 'No binario' : 
                       profile.gender === 'prefer-not-to-say' ? 'Prefiero no decirlo' : 
                       profile.gender === 'other' ? 'Otro' : profile.gender}
                    </p>
                  </div>
                )}
                
                {profile.likings && (
                  <div className="md:col-span-2">
                    <h3 className="text-gray-800 text-sm uppercase tracking-wider mb-1">Gustos</h3>
                    <p className="text-gray-900 text-lg">{profile.likings}</p>
                  </div>
                )}
              </div>
              
              {profile.biography && (
                <div>
                  <h3 className="text-gray-800 text-sm uppercase tracking-wider mb-2">Biografía</h3>
                  <div className="bg-white/10 p-6 rounded-xl">
                    <p className="text-gray-900 whitespace-pre-line">{profile.biography}</p>
                  </div>
                </div>
              )}
            </motion.div>
            
            {/* Tabs - Only show if viewing own profile or if it's another user's profile */}
            {currentUserId === profile.id ? (
              <>
                <motion.div 
                  className="flex justify-center mb-8"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
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
                      <span>Editar Perfil</span>
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
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.4,
                    ease: [0.6, -0.05, 0.01, 0.99]
                  }}
                  className="relative"
                >
                  {activeTab === 'info' ? (
                    <ProfileForm userId={profile.id} />
                  ) : (
                    <ProfileEditor userId={profile.id} isOwner={true} />
                  )}
                </motion.div>
              </>
            ) : (
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
                <ProfileEditor userId={profile.id} isOwner={false} />
              </motion.div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
} 