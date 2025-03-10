import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, User, Clock } from 'lucide-react';
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
    
    if (diffInDays === 0) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffInDays < 7) {
      // Within a week, show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older, show date
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

  if (loading) {
    return (
      <div className="glossy p-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-sky-700" />
          <h2 className="text-sky-900 font-semibold">Private Messages</h2>
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
        <MessageSquare className="w-5 h-5 text-sky-700" />
        <h2 className="text-sky-900 font-semibold">Private Messages</h2>
      </div>
      
      {chats.length === 0 ? (
        <div className="text-center py-6 text-sky-700">
          <p>No private conversations yet</p>
          <p className="text-sm mt-1 text-sky-600">
            Start chatting with other users to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              className="glass-button p-3 rounded-xl cursor-pointer relative"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleChatClick(chat.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold">
                  {chat.partner_email.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-sky-900 truncate">
                      {chat.partner_email}
                    </h3>
                    <span className="text-xs text-sky-700 whitespace-nowrap ml-2">
                      {formatTime(chat.last_message_time || chat.updated_at)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-sky-700 truncate">
                    {truncateMessage(chat.last_message)}
                  </p>
                </div>
              </div>
              
              {chat.unread_count > 0 && (
                <div className="absolute top-3 right-3 bg-violet-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {chat.unread_count}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 