import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ProfileEditor } from '../components/ProfileEditor';
import { ProfileForm } from '../components/ProfileForm';
import { motion } from 'framer-motion';
import { UserCircle, PaintBucket, Home, Mail, Calendar, User, Heart, Info } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  likings: string | null;
  age: number | null;
  gender: string | null;
  avatar_url: string | null;
  biography: string | null;
  location: string | null;
  interests: string[] | null;
  social_links: Record<string, string> | null;
  joined_date: string | null;
  canvas_state: string | null;
}

// Canvas component to render the profile background
const ProfileCanvas: React.FC<{ canvasState: string | null }> = ({ canvasState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasState || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    try {
      // Import fabric dynamically to avoid SSR issues
      import('fabric').then(({ fabric }) => {
        // Create a static fabric canvas (non-interactive)
        const fabricCanvas = new fabric.StaticCanvas(canvas, {
          enableRetinaScaling: true,
          renderOnAddRemove: true,
          backgroundColor: 'rgba(8, 47, 73, 0.2)', // Add a semi-transparent background color
        });
        
        // Set canvas dimensions to match container
        const resizeCanvas = () => {
          const container = canvas.parentElement;
          if (container) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            fabricCanvas.setWidth(width);
            fabricCanvas.setHeight(height);
            fabricCanvas.setDimensions({ width, height });
          }
        };
        
        // Initial resize and add resize listener
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Parse the canvas state and load it
        try {
          const canvasData = JSON.parse(canvasState);
          console.log('Parsed canvas data:', canvasData);
          
          // Check if the canvas data has the expected structure
          if (!canvasData.objects) {
            console.warn('Canvas data does not have objects array:', canvasData);
          }
          
          fabricCanvas.loadFromJSON(canvasData, () => {
            // Ensure the background color is applied
            if (!fabricCanvas.backgroundColor) {
              fabricCanvas.setBackgroundColor('rgba(8, 47, 73, 0.2)', () => {});
            }
            fabricCanvas.renderAll();
            console.log('Canvas background loaded successfully with', fabricCanvas.getObjects().length, 'objects');
          }, (o: any, object: any) => {
            // This callback is called for each object loaded
            console.log('Loaded object:', object?.type);
            return true;
          });
        } catch (parseError) {
          console.error('Error parsing canvas state:', parseError);
          console.error('Raw canvas state:', canvasState);
        }
        
        // Cleanup
        return () => {
          window.removeEventListener('resize', resizeCanvas);
          fabricCanvas.dispose();
        };
      }).catch(err => {
        console.error('Error loading fabric.js:', err);
      });
    } catch (error) {
      console.error('Error rendering canvas:', error);
    }
  }, [canvasState]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full rounded-[32px] z-0 opacity-90"
    />
  );
};

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
  const [activeTab, setActiveTab] = useState<'info'>('info');

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
          .select('id, email, avatar_url, created_at')
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
          biography: null,
          location: null,
          interests: null,
          social_links: null,
          joined_date: basicData.created_at,
          canvas_state: null
        };
        
        // Try to fetch each additional field individually
        const additionalFields = ['name', 'likings', 'age', 'gender', 'biography', 'location', 'interests', 'social_links', 'canvas_state'];
        
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

  // Add a useEffect to log the canvas_state when it changes
  useEffect(() => {
    if (profile?.canvas_state) {
      console.log('Canvas state found:', profile.canvas_state);
    }
  }, [profile?.canvas_state]);

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
      className="min-h-screen flex flex-col fixed inset-0 overflow-auto bg-gradient-to-b from-cyan-900 via-blue-950 to-indigo-950"
    >
      <Header unreadChats={0} userEmail={userEmail} />
      
      <div className="mt-24 pb-12 px-4 max-w-4xl mx-auto w-full relative z-10">
        {/* Decorative elements */}
        <div className="absolute top-[-50px] right-[-80px] w-64 h-64 bg-gradient-to-br from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-[-30px] left-[-60px] w-72 h-72 bg-gradient-to-tr from-cyan-300/20 to-blue-300/20 rounded-full blur-3xl -z-10"></div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-8 text-center">
            {/* Prismatic edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
            
            <h2 className="text-2xl font-bold text-cyan-300 mb-4">{error}</h2>
            <p className="text-cyan-400 mb-6">No se pudo encontrar el perfil solicitado.</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px]"
            >
              Volver al Inicio
            </button>
          </div>
        ) : profile ? (
          <>
            {/* Profile Info */}
            <motion.div
              className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-6 md:p-8 mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.6, -0.05, 0.01, 0.99]
              }}
            >
              {/* Canvas Background */}
              {profile.canvas_state && <ProfileCanvas canvasState={profile.canvas_state} />}
              
              {/* Content Container - ensures content is above canvas */}
              <div className="relative z-10">
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
                  <div className="relative">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.name || 'Perfil'} 
                        className="w-32 h-32 rounded-full object-cover border-4 border-cyan-500/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 flex items-center justify-center text-cyan-300 text-4xl font-bold border-4 border-cyan-500/30 shadow-lg">
                        {(profile.name || profile.email.split('@')[0]).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center md:text-left flex-1">
                    <h1 className="text-cyan-300 text-3xl font-bold mb-1">
                      {profile.name || profile.email.split('@')[0]}
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                      <Mail size={16} className="text-cyan-400" />
                      <p className="text-cyan-400">{profile.email}</p>
                    </div>
                    
                    {profile.joined_date && (
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                        <Calendar size={16} className="text-cyan-400" />
                        <p className="text-cyan-400">
                          Se unió el {new Date(profile.joined_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    
                    {currentUserId !== profile.id && (
                      <button
                        onClick={handleSendMessage}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px]"
                      >
                        Enviar Mensaje
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-cyan-800/20 p-6 rounded-xl border border-cyan-500/20">
                  {profile.age && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-1">Edad</h3>
                        <p className="text-cyan-100 text-lg">{profile.age} años</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.gender && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-1">Género</h3>
                        <p className="text-cyan-100 text-lg capitalize">
                          {profile.gender === 'male' ? 'Masculino' : 
                           profile.gender === 'female' ? 'Femenino' : 
                           profile.gender === 'non-binary' ? 'No binario' : 
                           profile.gender === 'prefer-not-to-say' ? 'Prefiero no decirlo' : 
                           profile.gender === 'other' ? 'Otro' : profile.gender}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {profile.location && (
                    <div className="flex items-start gap-3">
                      <Home className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-1">Ubicación</h3>
                        <p className="text-cyan-100 text-lg">{profile.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.likings && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <Heart className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-1">Gustos</h3>
                        <p className="text-cyan-100 text-lg">{profile.likings}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <Heart className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-1">Intereses</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.interests.map((interest, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-cyan-800/30 rounded-full text-cyan-300 border border-cyan-500/20"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {profile.social_links && Object.keys(profile.social_links).length > 0 && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <Info className="w-5 h-5 text-cyan-400 mt-0.5" />
                      <div>
                        <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-1">Redes Sociales</h3>
                        <div className="flex flex-col gap-2">
                          {Object.entries(profile.social_links).map(([platform, url]) => (
                            <a 
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-300 hover:text-cyan-100 transition-colors"
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {profile.biography && (
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-cyan-400 mt-1.5" />
                    <div className="flex-1">
                      <h3 className="text-cyan-300 text-sm uppercase tracking-wider mb-2">Biografía</h3>
                      <div className="bg-cyan-800/20 p-6 rounded-xl border border-cyan-500/20">
                        <p className="text-cyan-100 whitespace-pre-line">{profile.biography}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
            
            {/* Tabs - Only show if viewing own profile */}
            {currentUserId === profile.id && (
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
                    <span>Editar Perfil</span>
                  </button>
                </div>
              </motion.div>
            )}
            
            {/* Profile Form - Only show if viewing own profile and info tab is active */}
            {currentUserId === profile.id && (
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
                <ProfileForm userId={profile.id} />
              </motion.div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
} 