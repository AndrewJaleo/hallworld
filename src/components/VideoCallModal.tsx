import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer,
  useLocalParticipant,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { supabase } from '../lib/supabase';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  userId: string;
  partnerId: string;
  partnerName: string;
}

// Custom control bar component with glassmorphism styling
const CustomControls = ({ onEndCall }: { onEndCall: () => void }) => {
  const { localParticipant } = useLocalParticipant();
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const toggleMicrophone = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicEnabled);
      setIsMicEnabled(!isMicEnabled);
    }
  };

  const toggleCamera = () => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(!isCameraEnabled);
      setIsCameraEnabled(!isCameraEnabled);
    }
  };

  // Track microphone and camera state changes
  useTracks([Track.Source.Microphone, Track.Source.Camera]).forEach(track => {
    if (track.source === Track.Source.Microphone) {
      if (isMicEnabled !== track.enabled) {
        setIsMicEnabled(track.enabled);
      }
    } else if (track.source === Track.Source.Camera) {
      if (isCameraEnabled !== track.enabled) {
        setIsCameraEnabled(track.enabled);
      }
    }
  });

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center justify-center gap-4">
      <div className="relative overflow-hidden rounded-2xl bg-cyan-900/30 backdrop-blur-xl border border-cyan-500/30 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)] p-3 flex items-center gap-4">
        {/* Prismatic edge effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
        
        {/* Mic toggle button */}
        <button
          onClick={toggleMicrophone}
          className={`relative overflow-hidden rounded-full ${isMicEnabled ? 'bg-cyan-600/70' : 'bg-red-600/70'} backdrop-blur-md border border-cyan-500/30 p-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)] transition-all hover:scale-105`}
        >
          {isMicEnabled ? (
            <Mic className="w-5 h-5 text-white" />
          ) : (
            <MicOff className="w-5 h-5 text-white" />
          )}
        </button>
        
        {/* Camera toggle button */}
        <button
          onClick={toggleCamera}
          className={`relative overflow-hidden rounded-full ${isCameraEnabled ? 'bg-cyan-600/70' : 'bg-red-600/70'} backdrop-blur-md border border-cyan-500/30 p-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)] transition-all hover:scale-105`}
        >
          {isCameraEnabled ? (
            <Camera className="w-5 h-5 text-white" />
          ) : (
            <CameraOff className="w-5 h-5 text-white" />
          )}
        </button>
        
        {/* End call button */}
        <button
          onClick={onEndCall}
          className="relative overflow-hidden rounded-full bg-red-600/80 backdrop-blur-md border border-red-500/30 p-3 shadow-[0_2px_5px_rgba(31,38,135,0.1)] transition-all hover:scale-105 hover:bg-red-700/80"
        >
          <PhoneOff className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
};

// Custom video conference component with styled tiles
const CustomVideoConference = () => {
  return (
    <div className="h-full w-full">
      <VideoConference
        className="h-full"
        style={{
          // Override default LiveKit styles
          '--lk-participant-border-radius': '1.5rem',
          '--lk-participant-border': '1px solid rgba(8, 145, 178, 0.3)',
          '--lk-participant-gap': '1rem',
          '--lk-participant-bg': 'rgba(8, 47, 73, 0.3)',
          '--lk-participant-overlay-bg': 'rgba(8, 47, 73, 0.7)',
          '--lk-control-bg': 'transparent',
          '--lk-button-bg': 'rgba(8, 145, 178, 0.3)',
          '--lk-button-border': '1px solid rgba(8, 145, 178, 0.3)',
          '--lk-button-border-radius': '9999px',
          '--lk-button-hover-bg': 'rgba(8, 145, 178, 0.5)',
          '--lk-focus-border': '1px solid rgba(8, 145, 178, 0.8)',
        } as React.CSSProperties}
      />
    </div>
  );
};

export function VideoCallModal({
  isOpen,
  onClose,
  chatId,
  userId,
  partnerId,
  partnerName
}: VideoCallModalProps) {
  const [token, setToken] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);

  // Initialize call when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    
    const initializeCall = async () => {
      try {
        setIsConnecting(true);
        setError(null);
        
        // Generate room name
        const room = `chat_${chatId}`;
        setRoomName(room);
        
        // Check for existing call
        const { data: existingCalls, error: fetchError } = await supabase
          .from("video_calls")
          .select("*")
          .eq("chat_id", chatId)
          .eq("status", "active");
        
        if (fetchError) throw fetchError;
        
        let callRecord;
        
        // Create new call if none exists
        if (!existingCalls || existingCalls.length === 0) {
          const { data: newCall, error: insertError } = await supabase
            .from("video_calls")
            .insert({
              chat_id: chatId,
              initiator_id: userId,
              receiver_id: partnerId,
              status: "active",
              started_at: new Date().toISOString()
            })
            .select();
          
          if (insertError) throw insertError;
          callRecord = newCall[0];
        } else {
          callRecord = existingCalls[0];
        }
        
        if (!isMounted) return;
        
        setCallId(callRecord.id);
        
        // Log call start
        await supabase
          .from("call_logs")
          .insert({
            call_id: callRecord.id,
            user_id: userId,
            event_type: "call_started",
            details: { initiator: userId === callRecord.initiator_id }
          });
        
        // Get token
        try {
          const response = await fetch('https://tokenlk.civersia.com/api/get-livekit-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              room,
              username: userId,
              name: userId.substring(0, 10)
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get token');
          }
          
          const data = await response.json();
          
          if (!isMounted) return;
          
          console.log("Received token from server");
          setToken(data.token);
          setIsConnecting(false);
        } catch (tokenError) {
          if (!isMounted) return;
          console.error("Error getting token:", tokenError);
          throw new Error("No se pudo obtener el token para la videollamada");
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error initializing call:", error);
        setError(error instanceof Error ? error.message : "Error desconocido al iniciar la llamada");
        setIsConnecting(false);
      }
    };
    
    initializeCall();
    
    // Cleanup
    return () => {
      isMounted = false;
      
      if (callId) {
        // Log call end
        supabase
          .from("call_logs")
          .insert({
            call_id: callId,
            user_id: userId,
            event_type: "call_ended",
            details: { reason: "component_unmounted" }
          })
          .then(() => console.log("Call end logged"))
          .catch(err => console.error("Error logging call end:", err));
        
        // Update call status
        supabase
          .from("video_calls")
          .update({ 
            status: "ended", 
            ended_at: new Date().toISOString() 
          })
          .eq("id", callId)
          .then(() => console.log("Call marked as ended"))
          .catch(err => console.error("Error updating call status:", err));
      }
    };
  }, [isOpen, chatId, userId, partnerId]);

  // Handle call end
  const handleEndCall = async () => {
    try {
      if (callId) {
        // Log call end
        await supabase
          .from("call_logs")
          .insert({
            call_id: callId,
            user_id: userId,
            event_type: "call_ended_by_user",
            details: { manual_end: true }
          });
        
        // Update call status
        await supabase
          .from("video_calls")
          .update({ 
            status: "ended", 
            ended_at: new Date().toISOString() 
          })
          .eq("id", callId);
      }
      
      onClose();
    } catch (error) {
      console.error("Error ending call:", error);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-5xl h-[80vh] bg-gradient-to-b from-cyan-900/40 via-blue-950/40 to-indigo-950/40 rounded-[32px] overflow-hidden border border-cyan-500/30 shadow-[0_0_25px_rgba(8,145,178,0.3)] backdrop-blur-md"
          >
            {/* Prismatic edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-r from-cyan-900/60 to-blue-900/60 backdrop-blur-md border-b border-cyan-500/20">
              <h2 className="text-cyan-300 font-semibold flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border border-cyan-500/20 shadow-md mr-2">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
                Video Call with {partnerName}
              </h2>
            </div>
            
            {/* Video Call Content */}
            <div className="h-full pt-16">
              {isConnecting ? (
                <div className="h-full flex flex-col items-center justify-center text-cyan-300">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-cyan-300 font-medium">Connecting to video call...</p>
                  <p className="text-cyan-400/70 text-sm mt-2">Setting up secure connection</p>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-red-400">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/30">
                    <PhoneOff className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-lg font-medium">{error}</p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-6 py-2 bg-cyan-800/50 hover:bg-cyan-700/50 text-cyan-300 rounded-xl transition-colors border border-cyan-500/30 backdrop-blur-md"
                  >
                    Close
                  </button>
                </div>
              ) : (
                token && (
                  <div className="h-full relative">
                    <LiveKitRoom
                      token={token}
                      serverUrl="wss://erp-km0fvrdq.livekit.cloud"
                      options={{
                        adaptiveStream: true,
                        dynacast: true,
                        videoCaptureDefaults: {
                          resolution: { width: 640, height: 480 },
                        },
                        publishDefaults: {
                          simulcast: true,
                        },
                      }}
                      onDisconnected={() => {
                        console.log("Disconnected from LiveKit room");
                        handleEndCall();
                      }}
                    >
                      <CustomVideoConference />
                      <RoomAudioRenderer />
                      <CustomControls onEndCall={handleEndCall} />
                    </LiveKitRoom>
                  </div>
                )
              )}
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-20 left-6 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-20 right-6 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
