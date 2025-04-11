import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface CallNotificationContextType {
  incomingCall: {
    chatId: string;
    senderId: string;
    senderName: string;
  } | null;
  acceptCall: () => void;
  declineCall: () => void;
}

const CallNotificationContext = createContext<CallNotificationContextType | undefined>(undefined);

export const useCallNotification = () => {
  const context = useContext(CallNotificationContext);
  if (!context) {
    throw new Error('useCallNotification must be used within a CallNotificationProvider');
  }
  return context;
};

export const CallNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState<{
    chatId: string;
    senderId: string;
    senderName: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get current user
    let userId: string | null = null;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        userId = session.user.id;
        
        // Subscribe to call notifications
        const subscription = supabase
          .channel('call_notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'call_notifications',
              filter: `receiver_id=eq.${userId} AND status=eq.ringing`
            },
            async (payload) => {
              try {
                // Get sender info
                const { data: senderData } = await supabase
                  .from('profiles')
                  .select('email, username')
                  .eq('id', payload.new.sender_id)
                  .single();
                
                if (senderData) {
                  // Set incoming call data
                  setIncomingCall({
                    chatId: payload.new.chat_id,
                    senderId: payload.new.sender_id,
                    senderName: senderData.username || senderData.email.split('@')[0]
                  });
                  
                  // Play ringtone
                  try {
                    const audio = new Audio('/ringtone.mp3');
                    audio.loop = true;
                    audio.play().catch(e => console.log('Error playing ringtone', e));
                    
                    // Store audio reference to stop it later
                    window.incomingCallAudio = audio;
                  } catch (e) {
                    console.log('Error with audio', e);
                  }
                }
              } catch (error) {
                console.error('Error processing call notification:', error);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'call_notifications',
              filter: `receiver_id=eq.${userId}`
            },
            (payload) => {
              // If call was ended by the caller
              if (payload.new.status === 'ended' && incomingCall?.chatId === payload.new.chat_id) {
                // Stop ringtone
                if (window.incomingCallAudio) {
                  window.incomingCallAudio.pause();
                  window.incomingCallAudio = null;
                }
                
                setIncomingCall(null);
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
  
  const acceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      // Update call status
      await supabase
        .from('call_notifications')
        .update({ status: 'accepted' })
        .eq('chat_id', incomingCall.chatId)
        .eq('sender_id', incomingCall.senderId);
      
      // Stop ringtone
      if (window.incomingCallAudio) {
        window.incomingCallAudio.pause();
        window.incomingCallAudio = null;
      }
      
      // Navigate to chat page
      navigate({ to: `/layout/chat/${incomingCall.chatId}`, search: { video: 'true' } });
      
      // Clear incoming call
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };
  
  const declineCall = async () => {
    if (!incomingCall) return;
    
    try {
      // Update call status
      await supabase
        .from('call_notifications')
        .update({ status: 'declined' })
        .eq('chat_id', incomingCall.chatId)
        .eq('sender_id', incomingCall.senderId);
      
      // Stop ringtone
      if (window.incomingCallAudio) {
        window.incomingCallAudio.pause();
        window.incomingCallAudio = null;
      }
      
      // Clear incoming call
      setIncomingCall(null);
    } catch (error) {
      console.error('Error declining call:', error);
    }
  };
  
  return (
    <CallNotificationContext.Provider value={{ incomingCall, acceptCall, declineCall }}>
      {children}
      
      {/* Incoming Call UI */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-[1000] w-80 bg-gradient-to-r from-cyan-900/90 to-blue-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_25px_rgba(8,145,178,0.3)] overflow-hidden"
          >
            <div className="p-4">
              <h3 className="text-cyan-300 font-semibold text-lg mb-2">
                Incoming Video Call
              </h3>
              <p className="text-cyan-100 mb-4">
                {incomingCall.senderName} is calling you
              </p>
              
              <div className="flex justify-between gap-3">
                <button
                  onClick={declineCall}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-600/80 hover:bg-red-700/80 text-white transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                
                <button
                  onClick={acceptCall}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-600/80 hover:bg-green-700/80 text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CallNotificationContext.Provider>
  );
};
