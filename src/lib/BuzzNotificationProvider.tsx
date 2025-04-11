import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface BuzzNotificationContextType {
  showBuzz: (senderId: string, senderEmail: string) => void;
}

const BuzzNotificationContext = createContext<BuzzNotificationContextType | undefined>(undefined);

export const useBuzzNotification = () => {
  const context = useContext(BuzzNotificationContext);
  if (!context) {
    throw new Error('useBuzzNotification must be used within a BuzzNotificationProvider');
  }
  return context;
};

export const BuzzNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showBuzzAnimation, setShowBuzzAnimation] = useState<boolean>(false);
  const [buzzSender, setBuzzSender] = useState<{ id: string; email: string } | null>(null);
  
  useEffect(() => {
    // Get current user
    let userId: string | null = null;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        userId = session.user.id;
        
        // Subscribe to all private messages to detect buzzes
        const subscription = supabase
          .channel('global_buzz_notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'private_messages',
              filter: `is_buzz=eq.true`
            },
            async (payload) => {
              // Only process buzzes sent to the current user
              // We need to check if this user is part of the chat
              try {
                const { data: chatData } = await supabase
                  .from('private_chats')
                  .select('*')
                  .eq('id', payload.new.chat_id)
                  .single();
                
                // Check if current user is part of this chat
                if (chatData && 
                    (chatData.user1_id === userId || chatData.user2_id === userId) && 
                    payload.new.sender_id !== userId) {
                  
                  // Get sender info
                  const { data: senderData } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('id', payload.new.sender_id)
                    .single();
                  
                  if (senderData) {
                    // Trigger buzz notification
                    showBuzz(payload.new.sender_id, senderData.email);
                  }
                }
              } catch (error) {
                console.error('Error processing buzz notification:', error);
              }
            }
          )
          .subscribe();
          
        return () => {
          subscription.unsubscribe();
        };
      }
    });
  }, []);
  
  const showBuzz = (senderId: string, senderEmail: string) => {
    // Set the buzz sender info
    setBuzzSender({ id: senderId, email: senderEmail });
    
    // Play notification sound
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Error playing sound', e));
    } catch (e) {
      console.log('Error with audio', e);
    }
    
    // Vibrate device if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    // Show animation
    setShowBuzzAnimation(true);
    
    // Hide animation after 2 seconds
    setTimeout(() => {
      setShowBuzzAnimation(false);
      setBuzzSender(null);
    }, 2000);
  };
  
  return (
    <BuzzNotificationContext.Provider value={{ showBuzz }}>
      {children}
      
      {/* Global Buzz Animation */}
      <AnimatePresence>
        {showBuzzAnimation && buzzSender && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ 
                scale: [0.5, 1.2, 0.8, 1.1, 0.9, 1],
                rotate: [-10, 10, -5, 5, 0],
                x: [-20, 20, -10, 10, 0],
                y: [-10, 10, -5, 5, 0]
              }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-r from-yellow-400 to-amber-500 p-6 rounded-2xl shadow-lg text-center z-10"
            >
              <h2 className="text-4xl text-white font-bold mb-2">¡ZUMBIDO!</h2>
              <p className="text-white text-lg">
                {buzzSender.email.split('@')[0]} te ha enviado un zumbido
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BuzzNotificationContext.Provider>
  );
};
