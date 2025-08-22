import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, X, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '@tanstack/react-router';
import { Portal } from './Portal';

interface UserHall {
  id: string;
  name: string;
  category: string;
  city: string;
  type: string;
  hallerCount: number;
  isJoined?: boolean;
}

interface HallSelectorProps {
  currentHallId: string;
  userId: string;
  isMobile?: boolean;
  onHallChange: (hallId: string) => void;
}

export function HallSelector({ currentHallId, userId, isMobile = false, onHallChange }: HallSelectorProps) {
  const [userHalls, setUserHalls] = useState<UserHall[]>([]);
  const [allHalls, setAllHalls] = useState<UserHall[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen, isMobile]);

  // Fetch haller count for a specific hall
  const fetchHallerCount = async (hallId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('sender_id')
        .eq('group_id', hallId);

      if (error) throw error;

      const uniqueHallers = new Set(data.map(msg => msg.sender_id));
      return uniqueHallers.size;
    } catch (error) {
      console.error('Error fetching haller count:', error);
      return 0;
    }
  };

  // Función para unirse a un hall (solo para desktop)
  const joinHall = async (hallId: string) => {
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: hallId,
          sender_id: userId,
          content: '',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setAllHalls(prev => 
        prev.map(hall => 
          hall.id === hallId 
            ? { ...hall, isJoined: true, hallerCount: hall.hallerCount + 1 }
            : hall
        )
      );

      onHallChange(hallId);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Error joining hall:', error);
      alert('Failed to join hall. Please try again.');
    }
  };

  // Fetch user's halls and all available halls
  useEffect(() => {
    const fetchHalls = async () => {
      try {
        setIsLoading(true);

        // Obtener todos los halls disponibles
        const { data: allHallsData, error: allHallsError } = await supabase
          .from('group_chats')
          .select('id, name, category, city, type')
          .order('name');

        if (allHallsError) throw allHallsError;

        // Obtener halls donde el usuario ha enviado mensajes
        const { data: messagesData, error: messagesError } = await supabase
          .from('group_messages')
          .select('group_id')
          .eq('sender_id', userId);

        if (messagesError) throw messagesError;

        const joinedHallIds = [...new Set(messagesData.map(msg => msg.group_id))];

        // Obtener conteo de hallers para todos los halls
        const hallsWithCount = await Promise.all(
          (allHallsData || []).map(async (hall) => {
            const hallerCount = await fetchHallerCount(hall.id);
            return {
              ...hall,
              hallerCount,
              isJoined: joinedHallIds.includes(hall.id)
            };
          })
        );

        setAllHalls(hallsWithCount);
        
        // Filtrar solo los halls unidos para userHalls
        const joinedHalls = hallsWithCount.filter(hall => hall.isJoined);
        setUserHalls(joinedHalls);

      } catch (error) {
        console.error('Error fetching halls:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchHalls();
    }
  }, [userId]);

  const handleLeaveHall = async (hallId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', hallId)
        .eq('sender_id', userId);

      if (error) throw error;

      // Update local state
      setUserHalls(prev => prev.filter(hall => hall.id !== hallId));
      setAllHalls(prev => 
        prev.map(hall => 
          hall.id === hallId 
            ? { ...hall, isJoined: false, hallerCount: Math.max(0, hall.hallerCount - 1) }
            : hall
        )
      );

      // If leaving current hall, navigate to first available hall or home
      if (hallId === currentHallId) {
        const remainingHalls = userHalls.filter(hall => hall.id !== hallId);
        if (remainingHalls.length > 0) {
          navigate({ to: `/group-chat/${remainingHalls[0].id}` });
        } else {
          navigate({ to: '/' });
        }
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Error leaving hall:', error);
      alert('Failed to leave hall. Please try again.');
    }
  };

  const currentHall = userHalls.find(hall => hall.id === currentHallId);

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-8 h-8 bg-cyan-700/30 rounded-full"></div>
        <div className="w-32 h-4 bg-cyan-700/30 rounded"></div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile Selector - Responsivo */}
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-2 p-3 rounded-2xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 hover:bg-cyan-700/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border border-cyan-500/20 text-sm flex-shrink-0">
            {currentHall?.name?.charAt(0).toUpperCase() || "H"}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm text-left font-medium text-cyan-300 truncate w-full">
              {currentHall?.name || "Select Hall"}
            </span>
            <div className="flex items-left gap-1 text-xs text-cyan-400">
              <span className="truncate">{currentHall?.city}</span>
              {currentHall?.hallerCount && (
                <>
                  <span>•</span>
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span>{currentHall.hallerCount}</span>
                </>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-cyan-300 flex-shrink-0" />
        </button>

        {/* Mobile Modal - Hacia abajo con fondo transparente */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-start pt-20"
              onClick={() => setIsOpen(false)}
            >
              <motion.div
                initial={{ y: "-100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full mx-4 bg-cyan-900/95 backdrop-blur-xl border border-cyan-500/20 rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(6,182,212,0.3)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header sin handle (ya no es necesario) */}
                <div className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-cyan-300">My Halls</h3>
                      <p className="text-sm text-cyan-400 mt-1">
                        {userHalls.length} {userHalls.length === 1 ? 'hall' : 'halls'} joined
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-full bg-cyan-800/30 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-700/30 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Lista de halls con scroll */}
                <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
                  {userHalls.length > 0 ? (
                    <div className="space-y-3">
                      {userHalls.map((hall) => (
                        <div
                          key={hall.id}
                          className={`z-50 relative overflow-hidden rounded-2xl p-4 border transition-all ${
                            hall.id === currentHallId
                              ? 'bg-cyan-600/30 border-cyan-400/40 ring-1 ring-cyan-400/20'
                              : 'bg-cyan-800/30 border-cyan-500/20'
                          } backdrop-blur-md`}
                        >
                          <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => {
                              if (hall.id !== currentHallId) {
                                onHallChange(hall.id);
                              }
                              setIsOpen(false);
                            }}
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border border-cyan-500/20 flex-shrink-0">
                              {hall.name?.charAt(0).toUpperCase() || "H"}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-cyan-300 truncate">
                                  {hall.name}
                                </p>
                                {hall.id === currentHallId && (
                                  <span className="px-2 py-1 text-xs bg-cyan-600/20 border border-cyan-500/20 text-cyan-300 rounded-full flex-shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 text-sm text-cyan-400">
                                <span className="truncate">{hall.city}</span>
                                <span>•</span>
                                <span className="truncate">{hall.category}</span>
                              </div>
                              
                              <div className="flex items-center gap-1 text-xs text-cyan-400 mt-1">
                                <Users className="w-3 h-3 flex-shrink-0" />
                                <span>{hall.hallerCount} hallers</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => handleLeaveHall(hall.id, e)}
                              className="p-2 rounded-full bg-red-600/20 border border-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors flex-shrink-0"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-cyan-800/30 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-cyan-400" />
                      </div>
                      <h4 className="text-lg font-medium text-cyan-300 mb-2">No Halls Joined</h4>
                      <p className="text-sm text-cyan-400 px-4">
                        You haven't joined any halls yet. Send a message in a hall to become a Haller!
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop Dropdown
  return (
    <>
      {/* Desktop Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 hover:bg-cyan-700/30 transition-colors min-w-[220px] relative z-10"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-medium border border-cyan-500/20 text-sm">
          {currentHall?.name?.charAt(0).toUpperCase() || "H"}
        </div>
        <div className="flex flex-col items-start flex-1">
          <span className="text-sm font-medium text-cyan-300 truncate max-w-36">
            {currentHall?.name || "Select Hall"}
          </span>
          <div className="flex items-center gap-1 text-xs text-cyan-400">
            <span>{currentHall?.city}</span>
            {currentHall?.hallerCount && (
              <>
                <span>•</span>
                <Users className="w-3 h-3" />
                <span>{currentHall.hallerCount}</span>
              </>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-cyan-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop Dropdown - Rendered in Portal */}
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setIsOpen(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed w-96 max-h-[400px] overflow-y-auto z-[9999] bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 rounded-[24px] p-4 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)]"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                }}
              >
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-cyan-300">All Halls</h3>
                  <span className="text-sm text-cyan-400">{allHalls.length} total</span>
                </div>

                <div className="space-y-2">
                  {allHalls.map((hall) => (
                    <div
                      key={hall.id}
                      className={`group relative overflow-hidden rounded-xl p-3 border cursor-pointer transition-all hover:scale-[1.02] ${
                        hall.id === currentHallId
                          ? 'bg-cyan-600/30 border-cyan-400/40 ring-1 ring-cyan-400/30'
                          : hall.isJoined
                          ? 'bg-cyan-800/30 border-cyan-500/20 hover:bg-cyan-700/30'
                          : 'bg-gray-800/30 border-gray-500/20 hover:bg-gray-700/30'
                      } backdrop-blur-md`}
                      onClick={() => {
                        if (hall.isJoined) {
                          if (hall.id !== currentHallId) {
                            onHallChange(hall.id);
                          }
                          setIsOpen(false);
                        } else {
                          joinHall(hall.id);
                        }
                      }}
                    >
                      {/* Mini prismatic edge effect */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent opacity-30" />

                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                          hall.isJoined 
                            ? 'from-cyan-400 to-blue-500' 
                            : 'from-gray-400 to-gray-600'
                        } flex items-center justify-center text-white font-medium border ${
                          hall.isJoined 
                            ? 'border-cyan-500/20' 
                            : 'border-gray-500/20'
                        } shadow-md`}>
                          {hall.name?.charAt(0).toUpperCase() || "H"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium truncate ${
                              hall.isJoined ? 'text-cyan-300' : 'text-gray-300'
                            }`}>
                              {hall.name}
                            </p>
                            {!hall.isJoined && (
                              <span className="px-1.5 py-0.5 text-xs bg-green-600/20 border border-green-500/20 text-green-300 rounded-full flex-shrink-0">
                                Join
                              </span>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${
                            hall.isJoined ? 'text-cyan-400' : 'text-gray-400'
                          }`}>
                            <span>{hall.city}</span>
                            <span>•</span>
                            <span>{hall.category}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{hall.hallerCount} hallers</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Leave button - visible on hover for joined halls */}
                        {hall.isJoined && (
                          <button
                            onClick={(e) => handleLeaveHall(hall.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-red-600/20 border border-red-500/20 text-red-300 hover:bg-red-500/30 transition-all"
                          >
                            <LogOut className="w-3 h-3" />
                          </button>
                        )}
                        
                        {/* Current hall indicator */}
                        {hall.id === currentHallId && (
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {allHalls.length === 0 && (
                    <div className="text-center py-8 text-cyan-400">
                      <p className="text-sm">No halls available</p>
                      <p className="text-xs mt-1 text-cyan-500">Check back later for new halls</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
