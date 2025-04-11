import React, { useState, useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Header } from '../components/layout';
import { supabase } from '../lib/supabase';

/**
 * MainLayout - Primary layout component that wraps most pages
 * Includes the header and common styling elements
 */
export function MainLayout() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [unreadChats, setUnreadChats] = useState<number>(0);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "");
        fetchUnreadChatsCount(session.user.id);
      }
    });

    // Subscribe to changes in private_messages for new messages
    const messageInsertSubscription = supabase
      .channel('unread_messages_insert_mainlayout')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages'
        },
        () => {
          // Refetch unread count when new messages arrive
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              fetchUnreadChatsCount(session.user.id);
            }
          });
        }
      )
      .subscribe();

    // Subscribe to changes in private_messages for updates (read status)
    const messageUpdateSubscription = supabase
      .channel('unread_messages_update_mainlayout')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages'
        },
        () => {
          // Refetch unread count when messages are marked as read
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              fetchUnreadChatsCount(session.user.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      messageInsertSubscription.unsubscribe();
      messageUpdateSubscription.unsubscribe();
    };
  }, []);

  /**
   * Fetches the count of unread chat messages for the current user
   */
  const fetchUnreadChatsCount = async (userId: string) => {
    try {
      // Get all chats where the current user is either user1 or user2
      const { data: chatsData, error: chatsError } = await supabase
        .from('private_chats')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (chatsError) {
        return;
      }

      if (chatsData && chatsData.length > 0) {
        // Get all unread messages in these chats
        const chatIds = chatsData.map(chat => chat.id);

        const { count, error: countError } = await supabase
          .from('private_messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .neq('sender_id', userId)
          .is('read_at', null);

        if (countError) {
          return;
        }

        setUnreadChats(count || 0);
      } else {
        setUnreadChats(0);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-cyan-100" style={{ backgroundColor: '#0c2a4a' }}>
      {/* Video Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-screen" style={{ maxHeight: '140vh' }}>
          {/* Gradient overlay to help with transition */}
          <div className="absolute top-0 w-screen h-full inset-0 bg-[#0c2a4a] opacity-30 z-10"></div>

          {/* Video with fade effect */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain opacity-70 shadow-none"
            style={{
              maskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle, black 50%, transparent 100%)',
              boxShadow: 'none'
            }}
          >
            <source src="/hallword_background.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Content overlay with cyan accent colors */}
      <div className="min-h-screen relative z-10 flex flex-col">
        <Header unreadChats={unreadChats} userEmail={userEmail} />
        <Outlet />
      </div>
    </div>
  );
} 