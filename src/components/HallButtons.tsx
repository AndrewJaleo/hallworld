import React from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { mockGroupChats } from '../lib/mocks';

const hallCategories = [
  { id: 'group-1', name: 'University', color: 'from-violet-400 to-indigo-600' },
  { id: 'group-2', name: 'Art', color: 'from-fuchsia-400 to-purple-600' },
  { id: 'group-3', name: 'Plans', color: 'from-rose-400 to-pink-600' },
  { id: 'group-4', name: 'Sports', color: 'from-amber-400 to-orange-600' }
];

export function HallButtons() {
  const navigate = useNavigate();

  const handleHallClick = (groupId: string) => {
    navigate({ to: `/group-chat/${groupId}` });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {hallCategories.map((hall, index) => (
        <motion.button
          key={hall.id}
          onClick={() => handleHallClick(hall.id)}
          className="relative"
          whileHover={{ scale: 1.02, translateZ: 20 }}
          whileTap={{ scale: 0.98, translateZ: 10 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 17
          }}
        >
          <div className="relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(124,58,237,0.1)]">
            {/* Prismatic edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-70" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/70 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent opacity-50" />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-5">
              <div className="relative">
                <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 relative">
                  {/* Glass base */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${hall.color} opacity-90 rounded-2xl`} />
                  
                  {/* Glass reflections */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/50 via-transparent to-white/10" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-sky-200/30 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Top highlight */}
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent rounded-t-2xl opacity-60" />
                  
                  {/* Bottom glow */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-blue-400/40 to-transparent rounded-b-2xl" />
                  
                  {/* Border */}
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]" />
                  
                  {/* Icon */}
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                  
                  {/* Outer glow */}
                  <div className={`absolute -inset-1 ${hall.color.replace('from-', '').replace('to-', '')} rounded-3xl blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300`} />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className={`w-3 h-3 sm:w-4 sm:h-4 ${hall.color.split(' ')[0].replace('from-', 'text-')}`} />
                </motion.div>
              </div>
              <span className={`font-semibold bg-gradient-to-b ${hall.color} bg-clip-text text-transparent transition-colors text-base sm:text-lg lg:text-xl opacity-90`}>
                {hall.name}
              </span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}