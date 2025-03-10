import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  avatar_url?: string;
}

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
        fetchUsers(session.user.id);
      }
    };

    getCurrentUser();
    
    // Subscribe to changes in profiles
    const profileSubscription = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          // Refresh users when there's a change in profiles
          if (currentUserId) {
            fetchUsers(currentUserId);
          }
        }
      )
      .subscribe();
      
    return () => {
      profileSubscription.unsubscribe();
    };
  }, [currentUserId]);

  const fetchUsers = async (userId: string) => {
    try {
      setLoading(true);
      
      // Get all users except the current user
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, avatar_url')
        .neq('id', userId);
      
      if (error) throw error;
      
      setUsers(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startChat = async (partnerId: string) => {
    if (!currentUserId) return;
    
    try {
      // Check if a chat already exists between these users
      const { data: existingChats, error: checkError } = await supabase
        .from('private_chats')
        .select('id')
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${currentUserId})`)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingChats && existingChats.length > 0) {
        // Chat already exists, navigate to it
        navigate({ to: `/chat/${existingChats[0].id}` });
      } else {
        // Create a new chat
        const { data: newChat, error: createError } = await supabase
          .from('private_chats')
          .insert({
            user1_id: currentUserId,
            user2_id: partnerId
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        // Navigate to the new chat
        navigate({ to: `/chat/${newChat.id}` });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="glossy p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-sky-700" />
          <h2 className="text-sky-900 font-semibold">Users</h2>
        </div>
        <div className="animate-pulse flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-sky-100/50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glossy p-4 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-sky-700" />
        <h2 className="text-sky-900 font-semibold">Users</h2>
      </div>
      
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-sky-600" />
        </div>
        <input
          type="text"
          className="glass-input pl-10 pr-4 py-2 w-full rounded-xl"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredUsers.length === 0 ? (
        <div className="text-center py-6 text-sky-700">
          <p>No users found</p>
          {searchTerm && (
            <p className="text-sm mt-1 text-sky-600">
              Try a different search term
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              className="glass-button p-3 rounded-xl cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startChat(user.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-sky-900">
                    {user.email}
                  </h3>
                </div>
                
                <button 
                  className="glass-button p-2 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    startChat(user.id);
                  }}
                >
                  <MessageSquare className="w-4 h-4 text-violet-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 