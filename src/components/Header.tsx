import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from '@tanstack/react-router';

interface HeaderProps {
  unreadChats: number;
  userEmail: string;
}

export function Header({ unreadChats, userEmail }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const mockChats = [
    {
      id: 1,
      user: 'Laura García',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=256&h=256&auto=format&fit=crop',
      message: 'Hola! ¿Qué tal todo?',
      time: '2min'
    },
    {
      id: 2,
      user: 'Carlos Ruiz',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=256&h=256&auto=format&fit=crop',
      message: '¿Te apuntas al evento?',
      time: '5min'
    },
    {
      id: 3,
      user: 'Ana Martínez',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&h=256&auto=format&fit=crop',
      message: 'El concierto estuvo genial!',
      time: '15min'
    }
  ];

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4 pointer-events-none">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
        className="relative mx-auto max-w-7xl pointer-events-auto"
      >
        {/* Animated background glow */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-emerald-400/30 via-teal-400/30 to-cyan-400/30 blur-2xl transform-gpu"
        />
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.5, 0.6, 0.5],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-violet-400/30 via-fuchsia-400/30 to-pink-400/30 blur-2xl transform-gpu"
        />
        <motion.div
          animate={{
            scale: [1.02, 1, 1.02],
            opacity: [0.4, 0.5, 0.4],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-cyan-400/30 via-sky-400/30 to-blue-400/30 blur-2xl transform-gpu"
        />
        <motion.div
          animate={{
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-amber-400/30 via-orange-400/30 to-rose-400/30 blur-2xl transform-gpu"
        />
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/90 to-white/20 backdrop-blur-2xl">
          {/* Prismatic edge effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-90" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-70" />
        </div>

        <div className="relative rounded-[32px] overflow-hidden border border-white/60">
          {/* Frutiger Aero glass effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.5),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.6),transparent)]" />
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/90 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          {/* Dynamic light reflection */}
          <motion.div
            animate={{
              opacity: [0.2, 0.4, 0.2],
              backgroundPosition: ['100% 0', '0 0', '100% 0'],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent bg-[length:50%_100%] bg-no-repeat"
          />
          <motion.div
            animate={{
              opacity: [0.1, 0.3, 0.1],
              backgroundPosition: ['0 0', '100% 0', '0 0'],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent bg-[length:30%_100%] bg-no-repeat"
          />

          {/* Content */}
          <div className="relative px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg sm:text-xl font-bold bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent [text-shadow:0_2px_4px_rgba(255,255,255,0.5)]"
            >
              HallWorld
            </motion.div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <motion.button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-400/30 via-fuchsia-400/30 to-pink-400/30 blur-sm sm:blur-md transform-gpu animate-pulse" />
                  <div className="relative p-1.5 sm:p-2 rounded-full bg-gradient-to-b from-white/90 to-white/40 border border-white/80 shadow-lg backdrop-blur-xl">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/20 to-white/40" />
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                    {unreadChats > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-medium bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-full shadow-lg shadow-rose-500/30 border border-white/80">
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
                      className="fixed right-2 sm:right-4 mt-2 w-[calc(100vw-1rem)] sm:w-80 max-w-[20rem] sm:max-w-none z-[200]"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-400/20 via-fuchsia-400/20 to-pink-400/20 blur-xl transform-gpu" />
                        <div className="relative rounded-2xl border border-white/40 overflow-hidden backdrop-blur-xl">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/30 to-transparent" />

                          <div className="relative">
                            <div className="p-4 border-b border-white/20">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                                  Notificaciones
                                </h3>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-600">
                                  {unreadChats} nuevos
                                </span>
                              </div>
                            </div>

                            <div className="divide-y divide-white/10">
                              {mockChats.map(chat => (
                                <motion.div
                                  key={chat.id}
                                  className="relative group cursor-pointer"
                                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                >
                                  <div className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 blur-sm" />
                                        <img loading="lazy"
                                          src={chat.avatar}
                                          alt={chat.user}
                                          className="w-10 h-10 rounded-full object-cover border-2 border-white/80 relative"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <p className="font-medium text-gray-800 truncate text-sm sm:text-base">{chat.user}</p>
                                          <span className="text-[10px] sm:text-xs text-violet-600 ml-2">{chat.time}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">{chat.message}</p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <motion.button
                  onClick={() => setShowProfile(!showProfile)}
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-400/30 via-fuchsia-400/30 to-pink-400/30 blur-sm sm:blur-md transform-gpu animate-pulse" />
                  <div className="relative p-0.5 sm:p-1 rounded-full bg-gradient-to-b from-white/90 to-white/40 border border-white/80 shadow-lg backdrop-blur-xl">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-500 to-pink-500 flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-inner">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {showProfile && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="fixed right-2 sm:right-4 mt-2 w-[calc(100vw-1rem)] sm:w-72 max-w-[18rem] sm:max-w-none z-[200]"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-400/20 via-fuchsia-400/20 to-pink-400/20 blur-xl transform-gpu" />
                        <div className="relative rounded-2xl border border-white/40 overflow-hidden backdrop-blur-xl">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/30 to-transparent" />

                          <div className="relative">
                            <div className="p-4 border-b border-white/20">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 blur-sm" />
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-500 to-pink-500 flex items-center justify-center text-white text-xl font-medium border-2 border-white/80 relative">
                                    {userEmail.charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent truncate">
                                    {userEmail}
                                  </div>
                                  <div className="text-sm text-gray-500">Usuario</div>
                                </div>
                              </div>
                            </div>

                            <div className="p-1">
                              <Link
                                to="/profile"
                                onClick={() => setShowProfile(false)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 rounded-lg relative group"
                              >
                                <User className="w-4 h-4 text-violet-500" />
                                Mi perfil
                              </Link>

                              <motion.button
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-gray-700 rounded-lg relative group"
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                              >
                                <Settings className="w-4 h-4 text-violet-500" />
                                Ajustes
                              </motion.button>

                              <motion.button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-rose-600 rounded-lg relative group"
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                              >
                                <LogOut className="w-4 h-4 text-rose-500" />
                                Cerrar sesión
                              </motion.button>
                            </div>
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