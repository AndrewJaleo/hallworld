import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, LogOut, Settings, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link, useNavigate } from '@tanstack/react-router';

interface HeaderProps {
  unreadChats: number;
  userEmail: string;
}

interface ChatNotification {
  id: string;
  sender_email: string;
  content: string;
  created_at: string;
  chat_id: string;
}

/**
 * Header component - Main navigation header with notifications and user menu
 * Used in the MainLayout component
 */
export function Header({ unreadChats, userEmail }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showNotifications) {
      fetchUnreadMessages();
    }
  }, [showNotifications]);

  useEffect(() => {
    // Initial fetch of unread messages
    const fetchInitialUnreadMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        fetchUnreadMessages();
      }
    };

    fetchInitialUnreadMessages();

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('header_unread_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        (payload) => {
          // Refetch unread messages when a new message is received
          fetchUnreadMessages();
        }
      )
      .subscribe();

    // Also subscribe to updates (when messages are marked as read)
    const updateSubscription = supabase
      .channel('header_read_messages')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages'
        },
        () => {
          // Refetch unread messages when a message is updated (marked as read)
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      updateSubscription.unsubscribe();
    };
  }, []);

  const fetchUnreadMessages = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return;
      }
      
      const userId = session.user.id;
      
      // Get all chats where the current user is either user1 or user2
      const { data: chatsData, error: chatsError } = await supabase
        .from('private_chats')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      
      if (chatsError) throw chatsError;
      
      if (chatsData && chatsData.length > 0) {
        // Get all unread messages in these chats
        const chatIds = chatsData.map(chat => chat.id);
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('private_messages')
          .select(`
            id,
            chat_id,
            content,
            created_at,
            sender_id
          `)
          .in('chat_id', chatIds)
          .neq('sender_id', userId)
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (messagesError) throw messagesError;
        
        if (!messagesData || messagesData.length === 0) {
          setNotifications([]);
          setLoading(false);
          return;
        }
        
        // Get all sender IDs
        const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
        
        // Fetch profiles for all senders in a single query
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', senderIds);
          
        if (profilesError) {
          setLoading(false);
          return;
        }
        
        // Create a map of user IDs to emails for quick lookup
        const userEmailMap = profilesData.reduce((map, profile) => {
          map[profile.id] = profile.email;
          return map;
        }, {} as Record<string, string>);
        
        // Format notifications
        const formattedNotifications = messagesData.map((msg) => ({
          id: msg.id,
          sender_email: userEmailMap[msg.sender_id] || 'Unknown User',
          content: msg.content,
          created_at: msg.created_at,
          chat_id: msg.chat_id
        }));
        
        setNotifications(formattedNotifications);
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const handleNotificationClick = (chatId: string) => {
    setShowNotifications(false);
    navigate({ to: `/chat/${chatId}` });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}min`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 pointer-events-none overflow-visible">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
        className="relative mx-auto max-w-7xl pointer-events-auto overflow-visible"
      >
        {/* Subtle background glow */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-cyan-800/20 via-blue-900/20 to-indigo-950/20 blur-2xl transform-gpu"
        />

        {/* Main container with glassy effect */}
        <div className="relative rounded-[32px] overflow-visible bg-cyan-900/10 backdrop-blur-xl border border-cyan-700/20 shadow-lg">
          {/* Content */}
          <div className="relative px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between overflow-visible">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              {/* Logo - Make it clickable and redirect to home page */}
              <div 
                onClick={() => navigate({ to: '/' })}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <img 
                  src="/logo_hallworld.png" 
                  alt="HallWorld Logo" 
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
                {/* Brand name with updated gradient */}
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
                  HallWorld
                </span>
              </div>
            </motion.div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <div className="relative z-[150] overflow-visible" ref={notificationsRef}>
                <motion.button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                  }}
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-800/30 via-blue-900/30 to-indigo-950/30 blur-sm sm:blur-md transform-gpu animate-pulse" />
                  <div className="relative p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-xl border border-cyan-700/20 shadow-lg">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
                    {unreadChats > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-medium bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-full shadow-lg shadow-blue-900/30 border border-white/20">
                        {unreadChats}
                      </span>
                    )}
                  </div>
                </motion.button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[20rem] sm:max-w-none z-[999]"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-800/20 via-blue-900/20 to-indigo-950/20 blur-xl transform-gpu" />
                        <div className="relative rounded-2xl bg-black/20 backdrop-blur-xl border border-cyan-700/20 shadow-lg overflow-hidden">
                          <div className="relative">
                            <div className="p-4 border-b border-white/10">
                              <h3 className="text-sm font-semibold text-cyan-100">Notifications</h3>
                            </div>
                            
                            {loading ? (
                              <div className="p-4 flex justify-center">
                                <div className="w-6 h-6 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            ) : notifications.length > 0 ? (
                              <div className="max-h-[60vh] overflow-y-auto">
                                {notifications.map((notification) => (
                                  <div 
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification.chat_id)}
                                    className="p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-700 to-blue-900 flex items-center justify-center">
                                        <User className="w-4 h-4 text-cyan-100" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                          <p className="text-xs font-medium text-cyan-200 truncate">
                                            {notification.sender_email}
                                          </p>
                                          <span className="text-[10px] text-cyan-400">
                                            {formatTime(notification.created_at)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-cyan-300 mt-1 line-clamp-2">
                                          {notification.content}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 text-center">
                                <p className="text-xs text-cyan-400">No new notifications</p>
                              </div>
                            )}
                            
                            <div className="p-2 border-t border-white/10 bg-black/20">
                              <Link 
                                to="/"
                                className="block w-full py-1.5 px-3 text-xs text-center text-cyan-300 hover:text-cyan-100 hover:bg-white/5 rounded-lg transition-colors"
                                onClick={() => setShowNotifications(false)}
                              >
                                View all messages
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Profile */}
              <div className="relative z-[150]" ref={profileRef}>
                <motion.button
                  onClick={() => setShowProfile(!showProfile)}
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-800/30 via-blue-900/30 to-indigo-950/30 blur-sm sm:blur-md transform-gpu animate-pulse" />
                  <div className="relative p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-xl border border-cyan-700/20 shadow-lg">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
                  </div>
                </motion.button>

                <AnimatePresence>
                  {showProfile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-48 z-[999]"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-800/20 via-blue-900/20 to-indigo-950/20 blur-xl transform-gpu" />
                        <div className="relative rounded-2xl bg-black/20 backdrop-blur-xl border border-cyan-700/20 shadow-lg overflow-hidden">
                          <div className="p-3 border-b border-white/10">
                            <p className="text-xs font-medium text-cyan-100 truncate">{userEmail}</p>
                          </div>
                          
                          <div className="py-1">
                            <Link
                              to="/profile"
                              className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:bg-white/5 transition-colors"
                              onClick={() => setShowProfile(false)}
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Profile</span>
                            </Link>
                            
                            <Link
                              to="/"
                              className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:bg-white/5 transition-colors"
                              onClick={() => setShowProfile(false)}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Messages</span>
                              {unreadChats > 0 && (
                                <span className="ml-auto w-4 h-4 flex items-center justify-center text-[10px] font-medium bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-full">
                                  {unreadChats}
                                </span>
                              )}
                            </Link>
                            
                            <Link
                              to="/"
                              className="flex items-center gap-2 px-3 py-2 text-xs text-cyan-300 hover:bg-white/5 transition-colors"
                              onClick={() => setShowProfile(false)}
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span>Settings</span>
                            </Link>
                          </div>
                          
                          <div className="py-1 border-t border-white/10">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Logout</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </header>
  );
} 