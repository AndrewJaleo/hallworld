import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { ProfileEditor } from '../components/ProfileEditor';
import { ProfileForm } from '../components/ProfileForm';
import { motion } from 'framer-motion';
import { UserCircle } from 'lucide-react';
import '../styles/quill-preview.css'; // Importar los estilos del editor de texto enriquecido

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
  // Añadir campos de personalización para biografía y fondo
  bio_background_color: string | null;
  bio_background_image: string | null;
  bio_background_type: 'color' | 'image' | null;
  container_background_color: string | null;
  container_background_image: string | null;
  container_background_type: 'color' | 'image' | null;
}

// Componente para los estilos dinámicos del fondo del editor
interface EditorBackgroundStylesProps {
  color: string | null;
  image: string | null;
  type: 'color' | 'image' | null;
}

const EditorBackgroundStyles = ({ color, image, type }: EditorBackgroundStylesProps) => {
  const background = type === 'image' && image 
    ? `url(${image}) center/cover no-repeat` 
    : (color || 'rgba(8, 47, 73, 0.3)');
  
  const css = `
    .rich-text-preview {
      background: ${background};
      padding: 1rem;
      border-radius: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    /* Apply Quill styles to preview */
    .rich-text-preview .ql-size-small {
      font-size: 0.75em;
    }
    
    .rich-text-preview .ql-size-large {
      font-size: 1.5em;
    }
    
    .rich-text-preview .ql-size-huge {
      font-size: 2.5em;
    }
    
    .rich-text-preview p {
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview h1, 
    .rich-text-preview h2, 
    .rich-text-preview h3 {
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview ul, 
    .rich-text-preview ol {
      padding-left: 2em;
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview a {
      text-decoration: underline;
    }
    
    .rich-text-preview blockquote {
      border-left: 4px solid #ccc;
      padding-left: 16px;
      margin-bottom: 0.5em;
    }
    
    .rich-text-preview .ql-align-center {
      text-align: center;
    }
    
    .rich-text-preview .ql-align-right {
      text-align: right;
    }
    
    .rich-text-preview .ql-align-justify {
      text-align: justify;
    }
  `;
  
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

// Componente para los estilos de fondo del contenedor
interface ContainerBackgroundStylesProps {
  color: string | null;
  image: string | null;
  type: 'color' | 'image' | null;
}

const ContainerBackgroundStyles = ({ color, image, type }: ContainerBackgroundStylesProps) => {
  const background = type === 'image' && image 
    ? `url(${image}) center/cover no-repeat` 
    : (color || 'rgba(8, 47, 73, 0.2)');
  
  const css = `
    .profile-container {
      background: ${background};
      height: 600px; /* Altura fija de 600px */
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  `;
  
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

export function ProfileViewPage() {
  const { id } = useParams({ from: '/layout/profile/$id' });
  const navigate = useNavigate();
  
  // Current user state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Profile being viewed
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info'>('info');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

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
          canvas_state: null,
          bio_background_color: 'rgba(8, 47, 73, 0.3)',
          bio_background_image: null,
          bio_background_type: 'color',
          container_background_color: 'rgba(8, 47, 73, 0.2)',
          container_background_image: null,
          container_background_type: 'color'
        };
        
        // Try to fetch each additional field individually
        const additionalFields = [
          'name', 'likings', 'age', 'gender', 'biography', 'location', 'interests', 
          'social_links', 'canvas_state', 'bio_background_color', 'bio_background_image', 
          'bio_background_type', 'container_background_color', 'container_background_image', 
          'container_background_type'
        ];
        
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
  const handleSendMessage = async () => {
    if (!id || !currentUserId) return;
    
    try {
      // Show loading state
      setIsSendingMessage(true);
      
      // First, check if a private chat already exists between these users
      const { data: existingChats, error: chatError } = await supabase
        .from("private_chats")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .or(`user1_id.eq.${id},user2_id.eq.${id}`);
      
      if (chatError) {
        console.error("Error checking for existing chat:", chatError);
        throw chatError;
      }
      
      // Find a chat where both users are participants
      const existingChat = existingChats?.find(chat => 
        (chat.user1_id === currentUserId && chat.user2_id === id) || 
        (chat.user1_id === id && chat.user2_id === currentUserId)
      );
      
      let chatId;
      
      if (existingChat) {
        // Use existing chat
        chatId = existingChat.id;
      } else {
        // Create a new private chat
        const { data: newChat, error: createError } = await supabase
          .from("private_chats")
          .insert({
            user1_id: currentUserId,
            user2_id: id,
            created_at: new Date().toISOString()
          })
          .select();
        
        if (createError) {
          console.error("Error creating new chat:", createError);
          throw createError;
        }
        
        chatId = newChat?.[0]?.id;
      }
      
      if (chatId) {
        // Navigate to the private chat
        navigate({ to: `/chat/${chatId}` });
      } else {
        console.error("Failed to get or create private chat");
        // You could add an error notification here
      }
    } catch (error) {
      console.error("Error handling direct message:", error);
      // You could add an error notification here
    } finally {
      setIsSendingMessage(false);
    }
  };

  // If not authenticated, don't render anything
  if (!currentUserId) return null;

  return (
    <div 
      className="min-h-screen flex flex-col fixed inset-0 overflow-auto bg-gradient-to-b from-cyan-900 via-blue-950 to-indigo-950"
    >
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
            
            <h2 className="text-2xl font-bold text-cyan-300 mb-4 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{error}</h2>
            <p className="text-cyan-400 mb-6 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">No se pudo encontrar el perfil solicitado.</p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]"
            >
              Volver al Inicio
            </button>
          </div>
        ) : profile ? (
          <>
            {/* Estilos dinámicos para el fondo */}
            <EditorBackgroundStyles
              color={profile.bio_background_color}
              image={profile.bio_background_image}
              type={profile.bio_background_type}
            />
            
            {/* Estilos para el contenedor */}
            <ContainerBackgroundStyles
              color={profile.container_background_color}
              image={profile.container_background_image}
              type={profile.container_background_type}
            />
            
            {/* Profile Info */}
            <motion.div
              className={`profile-container relative overflow-hidden rounded-[32px] backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-6 md:p-8 mb-8`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                ease: [0.6, -0.05, 0.01, 0.99]
              }}
            >
              {/* Content Container - ensures content is above canvas */}
              <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-full">
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                
                {/* Avatar */}
                <div className="relative">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.name || 'Perfil'} 
                      className="w-32 h-32 rounded-full object-cover border-4 border-cyan-500/30 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 flex items-center justify-center text-cyan-300 text-4xl font-bold border-4 border-cyan-500/30 shadow-lg [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                      {(profile.name || profile.email.split('@')[0]).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* Nombre */}
                <h1 className="text-cyan-300 text-3xl font-bold mb-1 [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
                  {profile.name || profile.email.split('@')[0]}
                </h1>
                
                {/* Biografía con Rich Text */}
                {profile.biography && (
                  <div className="w-full rich-text-preview rounded-lg">
                    <div 
                      className="ql-container ql-snow" 
                      style={{ border: 'none' }}
                    >
                      <div 
                        className="ql-editor" 
                        dangerouslySetInnerHTML={{ __html: profile.biography }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Botón de mensaje (solo si no es el perfil propio) */}
                {currentUserId !== profile.id && (
                  <button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white font-medium hover:opacity-95 transition-all duration-300 shadow-lg hover:shadow-xl hover:translate-y-[-2px] [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                  >
                    {isSendingMessage ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Conectando...
                      </span>
                    ) : (
                      "Enviar Mensaje"
                    )}
                  </button>
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
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] ${
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
