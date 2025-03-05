import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { ProfileEditor } from '../components/ProfileEditor';

interface Profile {
  id: string;
  email: string;
  avatar_url?: string;
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
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, avatar_url')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        if (!data) {
          setError('Profile not found');
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
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
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="glossy p-8 rounded-2xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin mb-4"></div>
              <p className="text-white font-medium">Loading profile...</p>
            </div>
          </div>
        ) : error ? (
          <div className="glossy p-8 rounded-2xl text-center">
            <p className="text-white font-medium text-xl mb-2">{error}</p>
            <p className="text-white/70 mb-6">The profile you're looking for might not exist.</p>
            <button 
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-white font-medium"
            >
              Go Home
            </button>
          </div>
        ) : profile ? (
          <>
            <div className="glossy p-6 rounded-2xl mb-6">
              <h1 className="text-white text-2xl font-semibold mb-1">
                {profile.email.split('@')[0]}
              </h1>
              <p className="text-white/70 mb-4">{profile.email}</p>
              
              <button
                onClick={handleSendMessage}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              >
                Send Message
              </button>
            </div>
            
            <ProfileEditor userId={profile.id} isOwner={currentUserId === profile.id} />
          </>
        ) : null}
      </div>
    </div>
  );
} 