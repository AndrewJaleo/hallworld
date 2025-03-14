import { motion, AnimatePresence } from 'framer-motion';
import { Users, Heart, GraduationCap, Calendar, MapPin, UserPlus, Palette, Building2, Sparkles } from 'lucide-react';
import { getCountries } from '../lib/location';
import { useNavigate } from '@tanstack/react-router';
import { getOrCreateTopicGroupChat } from '../lib/chat';
import { useState } from 'react';

// Define interface for component props
interface CircularMenuProps {
  selectedCity?: string;
}

const menuItems = [
  { id: 'politica', label: 'Política', icon: Users, color: 'from-violet-500 via-purple-500 to-indigo-600' },
  { id: 'ligar', label: 'Ligar', icon: Heart, color: 'from-rose-500 via-pink-500 to-red-600' },
  { id: 'universidad', label: 'Universidad', icon: GraduationCap, color: 'from-amber-500 via-orange-500 to-yellow-600' },
  { id: 'planes', label: 'Planes', icon: Calendar, color: 'from-emerald-500 via-teal-500 to-green-600' },
  { id: 'cerca', label: 'Cerca de mí', icon: MapPin, color: 'from-sky-500 via-blue-500 to-cyan-600' },
  { id: 'amistad', label: 'Amistad', icon: UserPlus, color: 'from-fuchsia-500 via-purple-500 to-pink-600' },
  { id: 'arte', label: 'Arte', icon: Palette, color: 'from-cyan-500 via-sky-500 to-blue-600' },
  { id: 'ciudad', label: 'Ciudad', icon: Building2, color: 'from-violet-500 via-indigo-500 to-purple-600' }
];

// Function to find the country for a given city
const findCountryForCity = (city: string): string => {
  const countries = getCountries();
  for (const country of countries) {
    if (country.cities.includes(city)) {
      return country.name;
    }
  }
  return 'España'; // Default country if city not found
};

export function CircularMenu({ selectedCity = 'Madrid' }: CircularMenuProps) {
  // Get the country based on the selected city
  const countryName = findCountryForCity(selectedCity);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  
  // City item that will be displayed in the center
  const cityItem = { 
    id: 'currentCity', 
    label: selectedCity, // Use the selected city from props
    icon: Building2, 
    color: 'from-blue-600 via-indigo-600 to-purple-700',
    country: countryName // Store the country name
  };

  // Calculate positions for items in a circle
  const calculateCirclePosition = (index: number, total: number, radius: number) => {
    // Calculate angle in radians - offset by -Math.PI/2 to start from the top
    const angle = (index / total) * 2 * Math.PI - Math.PI/2;
    // Calculate x and y coordinates
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  };

  // Handle navigation to group chat when a topic is clicked
  const handleTopicClick = async (topicId: string) => {
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
      // If there's an error, fall back to the mock implementation
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

  // Animation variants for the menu items
  const menuItemVariants = {
    initial: (index: number) => ({
      x: 0,
      y: 0,
      opacity: 0,
      scale: 0.8,
      rotate: -5,
    }),
    animate: (index: number) => {
      // Fixed radius for perfect circle
      const radius = 150;
      const position = calculateCirclePosition(index, menuItems.length, radius);
      
      return {
        x: position.x,
        y: position.y,
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
          type: "spring",
          stiffness: 300,
          damping: 25,
          delay: index * 0.05, // Staggered animation
        }
      };
    },
    cityChange: (index: number) => {
      // Fixed radius for perfect circle
      const radius = 150;
      const position = calculateCirclePosition(index, menuItems.length, radius);
      
      return {
        x: position.x,
        y: position.y,
        opacity: 1,
        scale: [0.95, 1.1, 1],
        rotate: [-2, 2, 0],
        transition: {
          duration: 0.5,
          times: [0, 0.6, 1],
          delay: index * 0.03, // Faster staggered animation
        }
      };
    }
  };

  return (
    <div className="mt-8 bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 pb-6 sm:pb-safe z-50 lg:max-w-7xl lg:mx-auto">
      <div className="relative max-w-xl lg:max-w-full mx-auto">
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
          className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-violet-400/20 via-fuchsia-400/20 to-pink-400/20 blur-2xl transform-gpu"
        />

        {/* Content container */}
        <div className="relative p-4 sm:p-5">
          <motion.div
            className="relative"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          >
            {/* Circular menu container */}
            <div className="relative h-[320px] sm:h-[380px] lg:h-[420px] flex items-center justify-center">
              {/* Center city item */}
              <motion.button
                key={cityItem.id}
                className="absolute z-20 overflow-hidden"
                style={{
                  borderRadius: '50%',
                }}
                whileHover={{ scale: 1.05, translateZ: 30 }}
                whileTap={{ scale: 0.98, translateZ: 10 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 17
                }}
              >
                {/* Rounded rectangle card for center city */}
                <div className="relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg w-32 sm:w-36 lg:w-40">
                  {/* Pulse animation on city change */}
                  <motion.div 
                    key={`pulse-${cityItem.label}`}
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ 
                      opacity: [0.5, 0, 0],
                      scale: [0.95, 1.2, 1.2]
                    }}
                    transition={{ 
                      duration: 1.5,
                      times: [0, 0.7, 1]
                    }}
                    className="absolute inset-0 rounded-[32px] bg-blue-400/20 z-0"
                  />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-5">
                    {/* Circular icon */}
                    <div className="relative">
                      <motion.div 
                        key={`icon-${cityItem.label}`}
                        initial={{ scale: 0.9, rotate: -5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 15 
                        }}
                        className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 rounded-full flex items-center justify-center relative shadow-lg bg-gradient-to-br from-blue-400/90 to-blue-600/90"
                      >
                        {/* Border */}
                        <div className="absolute inset-0 rounded-full ring-1 ring-white/30" />

                        {/* Icon */}
                        <cityItem.icon className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-white relative z-10" />

                        {/* Sparkle */}
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
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
                        </motion.div>
                      </motion.div>
                    </div>
                    
                    {/* City Label */}
                    <AnimatePresence mode="wait">
                      <motion.span 
                        key={`city-${cityItem.label}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 line-clamp-1"
                      >
                        {cityItem.label}
                      </motion.span>
                    </AnimatePresence>
                    
                    {/* Country Label */}
                    <AnimatePresence mode="wait">
                    
                    </AnimatePresence>
                  </div>
                </div>
              </motion.button>

              {/* Circle arrangement of menu items */}
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                
                // Determine text color based on item
                const textColorMap: Record<string, string> = {
                  'politica': 'text-violet-300',
                  'ligar': 'text-rose-300',
                  'universidad': 'text-amber-300',
                  'planes': 'text-emerald-300',
                  'cerca': 'text-sky-300',
                  'amistad': 'text-fuchsia-300',
                  'arte': 'text-cyan-300',
                  'ciudad': 'text-violet-300'
                };
                
                // Determine icon background color
                const bgColorMap: Record<string, string> = {
                  'politica': 'from-violet-400/90 to-violet-600/90',
                  'ligar': 'from-rose-400/90 to-rose-600/90',
                  'universidad': 'from-amber-400/90 to-amber-600/90',
                  'planes': 'from-emerald-400/90 to-emerald-600/90',
                  'cerca': 'from-sky-400/90 to-sky-600/90',
                  'amistad': 'from-fuchsia-400/90 to-fuchsia-600/90',
                  'arte': 'from-cyan-400/90 to-cyan-600/90',
                  'ciudad': 'from-violet-400/90 to-violet-600/90'
                };
                
                const textColor = textColorMap[item.id] || 'text-blue-300';
                const bgColor = bgColorMap[item.id] || 'from-blue-400/90 to-blue-600/90';
                
                return (
                  <motion.button
                    key={`${item.id}-${cityItem.label}`}
                    className="absolute overflow-hidden"
                    style={{
                      borderRadius: '50%',
                    }}
                    custom={index}
                    variants={menuItemVariants}
                    initial="initial"
                    animate="cityChange"
                    whileHover={{ scale: 1.1, translateZ: 24 }}
                    whileTap={{ scale: 0.95, translateZ: 10 }}
                    onClick={() => handleTopicClick(item.id)}
                    disabled={isLoading[item.id]}
                  >
                    {/* Rounded rectangle card */}
                    <div className="relative overflow-hidden rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg w-24 sm:w-28">
                      {/* Ripple effect on city change */}
                      <motion.div 
                        key={`ripple-${item.id}-${cityItem.label}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ 
                          opacity: [0.3, 0, 0],
                          scale: [0.5, 1.3, 1.3]
                        }}
                        transition={{ 
                          duration: 1,
                          delay: index * 0.05,
                          times: [0, 0.7, 1]
                        }}
                        className={`absolute inset-0 rounded-[32px] bg-gradient-to-br ${bgColor.replace('/90', '/20')} z-0`}
                      />

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center gap-2 p-3 sm:p-4">
                        {/* Circular icon */}
                        <div className="relative">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center relative shadow-lg bg-gradient-to-br ${bgColor}`}>
                            {/* Loading indicator */}
                            {isLoading[item.id] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                            
                            {/* Border */}
                            <div className="absolute inset-0 rounded-full ring-1 ring-white/30" />

                            {/* Icon */}
                            <motion.div
                              key={`icon-${item.id}-${cityItem.label}`}
                              initial={{ scale: 1 }}
                              animate={{ 
                                scale: [1, 1.2, 1],
                                rotate: [0, index % 2 === 0 ? 10 : -10, 0]
                              }}
                              transition={{ 
                                duration: 0.5,
                                delay: 0.1 + index * 0.04,
                                times: [0, 0.5, 1]
                              }}
                            >
                              <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white relative z-10" />
                            </motion.div>

                            {/* Sparkle */}
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
                              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
                            </motion.div>
                          </div>
                        </div>
                        
                        {/* Label */}
                        <motion.span 
                          key={`label-${item.id}-${cityItem.label}`}
                          initial={{ opacity: 1 }}
                          animate={{ 
                            opacity: [1, 0.7, 1],
                            y: [0, -2, 0]
                          }}
                          transition={{ 
                            duration: 0.5,
                            delay: 0.2 + index * 0.04,
                            times: [0, 0.5, 1]
                          }}
                          className={`text-sm sm:text-base font-semibold ${textColor} line-clamp-1`}
                        >
                          {item.label}
                        </motion.span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}