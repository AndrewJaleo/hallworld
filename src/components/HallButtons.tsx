import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { getOrCreateTopicGroupChat } from '../lib/chat';

const hallCategories = [
  { id: 'universidad', name: 'University', color: 'from-violet-400 to-indigo-600' },
  { id: 'arte', name: 'Art', color: 'from-fuchsia-400 to-purple-600' },
  { id: 'planes', name: 'Plans', color: 'from-amber-400 to-orange-600' },
  { id: 'amistad', name: 'Friends', color: 'from-rose-400 to-pink-600' }
];

interface HallButtonsProps {
  selectedCity?: string;
}

export function HallButtons({ selectedCity = 'Madrid' }: HallButtonsProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const handleHallClick = async (topicId: string) => {
    try {
      // Set loading state for this topic
      setIsLoading(prev => ({ ...prev, [topicId]: true }));

      // Get or create the group chat for this topic and city
      const groupChatId = await getOrCreateTopicGroupChat(topicId, selectedCity);

      // Navigate to the group chat page with the group chat ID
      navigate({
        to: '/group-chat/$id',
        params: { id: groupChatId }
      });
    } catch (error) {
      console.error('Error creating group chat:', error);
      // If there's an error, fall back to a simpler navigation
      navigate({
        to: '/group-chat/$id',
        params: { id: topicId },
        search: { city: selectedCity }
      });
    } finally {
      // Clear loading state
      setIsLoading(prev => ({ ...prev, [topicId]: false }));
    }
  };

  return (
    <div className="w-full justify-center gap-3 sm:gap-4 flex lg:gap-6">
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
          disabled={isLoading[hall.id]}
        >
          <div className="w-20 md:w-28 md:h-32 relative overflow-hidden rounded-[32px] bg-black/0 shadow-[0_4px_15px_rgba(31,38,135,0.01),0_0_10px_rgba(124,58,237,0.1)]">
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

                  {/* Icon or Loading Spinner */}
                  {isLoading[hall.id] ? (
                    <svg className="animate-spin w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white z-20" />
                  )}

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
                  <Sparkles className={`w-3 h-3 sm:w-4 sm:h-4 text-blue-200}`} />
                </motion.div>
              </div>
              <span className={`font-medium md:font-medium text-white text-sm md:text-md sm:text-md lg:text-lg`}>
                {hall.name}
              </span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}