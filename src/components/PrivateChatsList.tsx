import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, Clock, Check, CheckCheck, ArrowUpCircle, Search } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';

interface PrivateChat {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string;
  last_message_time: string;
  updated_at: string;
  partner_email: string;
  partner_id: string;
  unread_count: number;
}

export function PrivateChatsList() {
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<PrivateChat[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        fetchChats(session.user.id);
      }
    };

    getCurrentUser();

    // Subscribe to changes in private_chats
    const chatSubscription = supabase
      .channel('private_chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'private_chats',
        },
        (payload) => {
          // Refresh chats when there's a change
          if (userId) {
            fetchChats(userId);
          }
        }
      )
      .subscribe();

    // Also subscribe to changes in private_messages to update unread counts
    const messageSubscription = supabase
      .channel('private_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          // Refresh chats when there's a new message
          if (userId) {
            fetchChats(userId);
          }
        }
      )
      .subscribe();

    return () => {
      chatSubscription.unsubscribe();
      messageSubscription.unsubscribe();
    };
  }, []);

  // Filter chats when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredChats(chats);
      return;
    }

    const filtered = chats.filter(chat => 
      getUsernameFromEmail(chat.partner_email).toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredChats(filtered);
  }, [chats, searchQuery]);

  const fetchChats = async (currentUserId: string) => {
    try {
      setLoading(true);

      // Get all chats where the current user is either user1 or user2
      const { data: chatsData, error: chatsError } = await supabase
        .from('private_chats')
        .select('*')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order('updated_at', { ascending: false });

      if (chatsError) throw chatsError;

      if (!chatsData || chatsData.length === 0) {
        setChats([]);
        setFilteredChats([]);
        setLoading(false);
        return;
      }

      // Get all partner IDs
      const partnerIds = chatsData.map(chat =>
        chat.user1_id === currentUserId ? chat.user2_id : chat.user1_id
      );

      // Fetch all partner profiles in a single query
      const { data: partnersData, error: partnersError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', partnerIds);

      if (partnersError) {
        console.error('Error fetching partner data:', partnersError);
        setLoading(false);
        return;
      }

      // Create a map of user IDs to emails for quick lookup
      const partnerEmailMap = partnersData.reduce((map, profile) => {
        map[profile.id] = profile.email;
        return map;
      }, {} as Record<string, string>);

      // Get unread message counts for all chats in a single query
      const { data: unreadCountsData, error: unreadCountsError } = await supabase
        .from('private_messages')
        .select('chat_id, sender_id, read_at')
        .in('chat_id', chatsData.map(chat => chat.id))
        .neq('sender_id', currentUserId)
        .is('read_at', null);

      if (unreadCountsError) {
        console.error('Error counting unread messages:', unreadCountsError);
      }

      // Count unread messages per chat
      const unreadCountMap: Record<string, number> = {};
      if (unreadCountsData) {
        unreadCountsData.forEach(msg => {
          unreadCountMap[msg.chat_id] = (unreadCountMap[msg.chat_id] || 0) + 1;
        });
      }

      // Process each chat with the data we've fetched
      const processedChats = chatsData.map(chat => {
        const partnerId = chat.user1_id === currentUserId ? chat.user2_id : chat.user1_id;

        return {
          ...chat,
          partner_email: partnerEmailMap[partnerId] || 'Unknown User',
          partner_id: partnerId,
          unread_count: unreadCountMap[chat.id] || 0
        };
      });

      setChats(processedChats);
      setFilteredChats(processedChats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleChatClick = (chatId: string) => {
    navigate({ to: `/chat/${chatId}` });
  };

  const truncateMessage = (message: string | null, maxLength = 30) => {
    if (!message) return 'Start a conversation';
    if (message.length <= maxLength) return message;
    return `${message.substring(0, maxLength)}...`;
  };

  // Obtener el nombre de usuario a partir del email
  const getUsernameFromEmail = (email: string) => {
    return email.split('@')[0];
  };

  // Generar colores pastel únicos basados en el nombre de usuario
  const generateAvatarColors = (username: string) => {
    // Hash simple para generar un valor numérico a partir del nombre
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Lista de combinaciones de colores pastel modernos
    const colorPairs = [
      { from: 'from-cyan-400', to: 'to-blue-500' },
      { from: 'from-blue-400', to: 'to-indigo-500' },
      { from: 'from-indigo-400', to: 'to-purple-500' },
      { from: 'from-purple-400', to: 'to-pink-500' },
      { from: 'from-pink-400', to: 'to-rose-500' },
      { from: 'from-rose-400', to: 'to-red-500' },
      { from: 'from-red-400', to: 'to-orange-500' },
      { from: 'from-orange-400', to: 'to-amber-500' },
      { from: 'from-amber-400', to: 'to-yellow-500' },
      { from: 'from-yellow-400', to: 'to-lime-500' },
      { from: 'from-lime-400', to: 'to-green-500' },
      { from: 'from-green-400', to: 'to-emerald-500' },
      { from: 'from-emerald-400', to: 'to-teal-500' },
      { from: 'from-teal-400', to: 'to-cyan-500' },
    ];
    
    // Seleccionar un par de colores basado en el hash
    const colorPair = colorPairs[hash % colorPairs.length];
    
    return `bg-gradient-to-br ${colorPair.from} ${colorPair.to}`;
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_10px_20px_rgba(6,182,212,0.2)] p-6">
        {/* Prismatic edge effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                Private Messages
              </h2>
            </div>
            
            <div className="py-1 px-3 rounded-full bg-cyan-800/30 text-xs text-cyan-400 border border-cyan-500/20">
              <span className="animate-pulse">Loading conversations...</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="h-10 rounded-full bg-cyan-800/30 w-full animate-pulse"></div>
          </div>

          <div className="animate-pulse flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-cyan-800/30">
                <div className="rounded-full bg-cyan-800/40 h-14 w-14"></div>
                <div className="flex-1">
                  <div className="h-5 bg-cyan-800/40 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-cyan-800/30 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_10px_20px_rgba(6,182,212,0.2)] p-6">
      {/* Animated background glow */}
      <div className="absolute -z-10 inset-0">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1/3 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* Prismatic edge effect */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

      <div className="flex flex-col gap-5">
        {/* Header and search bar */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Private Messages
            </h2>
          </div>
          
          {filteredChats.length > 0 && (
            <div className="py-1 px-3 rounded-full bg-cyan-800/30 text-xs text-cyan-300 border border-cyan-500/20 shadow-inner">
              {filteredChats.length} {filteredChats.length === 1 ? 'conversation' : 'conversations'}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-11 pr-4 rounded-full bg-cyan-800/30 backdrop-blur-sm border border-cyan-500/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 text-cyan-100 placeholder-cyan-500/50 outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-cyan-400 hover:text-cyan-300"
            >
              <span className="text-xs">Clear</span>
            </button>
          )}
        </div>

        {/* Empty state */}
        {filteredChats.length === 0 && (
          <div className="text-center py-10 text-cyan-300">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-md mb-4 shadow-lg"
            >
              <MessageSquare className="w-10 h-10 text-cyan-400" />
            </motion.div>
            
            {searchQuery ? (
              <>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-medium text-lg"
                >
                  No matching conversations
                </motion.p>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm mt-2 text-cyan-400"
                >
                  Try a different search term
                </motion.p>
              </>
            ) : (
              <>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-medium text-lg"
                >
                  No conversations yet
                </motion.p>
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm mt-2 text-cyan-400"
                >
                  Connect with other users to start chatting
                </motion.p>
              </>
            )}
          </div>
        )}

        {/* Conversation list */}
        {filteredChats.length > 0 && (
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 custom-scrollbar">
            <AnimatePresence>
              {filteredChats.map((chat, index) => {
                const username = getUsernameFromEmail(chat.partner_email);
                const avatarColors = generateAvatarColors(username);
                // Simulating online status randomly - replace with actual online status logic
                const isOnline = Math.random() > 0.7;
                
                return (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    transition={{ 
                      duration: 0.2,
                      delay: index * 0.05,
                      layout: { type: "spring", damping: 15, stiffness: 250 }
                    }}
                    className="relative overflow-hidden rounded-xl hover:rounded-2xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-400/30 p-4 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(8, 145, 178, 0.2)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChatClick(chat.id)}
                  >
                    {/* Subtle highlight gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 rounded-full ${avatarColors} flex items-center justify-center text-white font-semibold text-xl shadow-lg shadow-cyan-500/10 border border-white/10`}>
                          {username.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Online status indicator */}
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-cyan-800 shadow-lg"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-cyan-100 truncate group-hover:text-white transition-colors">
                            {username}
                          </h3>
                          <div className="flex items-center gap-1 ml-2">
                            {chat.last_message_time && (
                              <span className="text-xs text-cyan-400 whitespace-nowrap group-hover:text-cyan-300 transition-colors">
                                {formatTime(chat.last_message_time)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-cyan-400 truncate max-w-[85%] group-hover:text-cyan-300 transition-colors">
                            {truncateMessage(chat.last_message)}
                          </p>
                          
                          <div className="flex items-center">
                            {chat.unread_count === 0 && (
                              <Check className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unread count badge */}
                    {chat.unread_count > 0 && (
                      <div className="absolute top-4 right-4 bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs font-medium rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-[0_2px_5px_rgba(6,182,212,0.3)] border border-white/10">
                        {chat.unread_count}
                      </div>
                    )}
                    
                    {/* Recent message indicator */}
                    {chat.last_message_time && new Date(chat.last_message_time).getTime() > Date.now() - 1000 * 60 * 60 && (
                      <div className="absolute bottom-4 right-4 text-[10px] text-cyan-400 flex items-center group-hover:text-cyan-300 transition-colors">
                        <Clock size={10} className="mr-1" />
                        {formatTime(chat.last_message_time)}
                      </div>
                    )}
                    
                    {/* Subtle glow effect for chats with unread messages */}
                    {chat.unread_count > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-30 group-hover:opacity-0 transition-opacity"></div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(8, 145, 178, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(8, 145, 178, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(8, 145, 178, 0.3);
        }
      `}</style>
    </div>
  );
}
