import { motion } from 'framer-motion';
import { Users, Heart, GraduationCap, Calendar, MapPin, UserPlus, Palette, Building2, Sparkles } from 'lucide-react';

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

export function CircularMenu() {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 pb-6 sm:pb-safe z-50 lg:max-w-7xl lg:mx-auto">
      <div className="relative max-w-xl lg:max-w-full mx-auto">
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
          className="opacity-0 absolute inset-0 rounded-3xl bg-transparent"
        />
        <motion.div
          animate={{
            scale: [1.02, 1, 1.02],
            opacity: [0.4, 0.5, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="opacity-0 absolute inset-0 rounded-3xl bg-transparent"
        />

        {/* Glass container */}
        <div className="relative rounded-3xl overflow-hidden bg-transparent">
          {/* Glass base layer */}
          <div className="opacity-0 absolute inset-0 bg-transparent" />

          {/* Prismatic edge effect */}
          <div className="opacity-0 absolute inset-x-0 top-0 h-px bg-transparent" />
          <div className="opacity-0 absolute inset-x-0 bottom-0 h-px bg-transparent" />
          <div className="opacity-0 absolute inset-y-0 left-0 w-px bg-transparent" />
          <div className="opacity-0 absolute inset-y-0 right-0 w-px bg-transparent" />

          {/* Inner shadow and highlights */}
          <div className="opacity-0 absolute inset-0 bg-transparent" />
          <div className="opacity-0 absolute inset-0 bg-transparent" />
          <div className="opacity-0 absolute inset-0 bg-transparent" />

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
            className="opacity-0 absolute inset-0 bg-transparent"
          />

          {/* Content container */}
          <div className="relative p-4 sm:p-5">
            <motion.div
              className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 lg:gap-4"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.id}
                    className="menu-item relative overflow-hidden"
                    whileHover={{ scale: 1.03, translateZ: 24 }}
                    whileTap={{ scale: 0.98, translateZ: 10 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 17
                    }}
                  >
                    <div className="relative overflow-hidden rounded-2xl w-full bg-transparent">
                      {/* Glass effect layers */}
                      <div className="opacity-0 absolute inset-0 bg-transparent" />
                      <div className="absolute inset-0 bg-transparent transition-opacity duration-300" />

                      {/* Dynamic reflection */}
                      <div className="opacity-0 absolute -inset-full bg-transparent" />

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-4">
                        <div className="relative">
                          <div className="w-9 h-9 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 relative shadow-lg">
                            {/* Glass base */}
                            <div className={`opacity-0 absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl opacity-95`} />

                            {/* Glass reflections */}
                            <div className="opacity-0 absolute inset-0 rounded-2xl bg-gradient-to-b from-white/90 via-transparent to-white/30" />
                            <div className="opacity-0 absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-sky-200/60 to-white/80 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Top highlight */}
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/95 to-transparent rounded-t-2xl opacity-90" />

                            {/* Bottom glow */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-400/80 to-transparent rounded-b-2xl" />

                            {/* Border */}
                            <div className="absolute inset-0 rounded-2xl ring-2 ring-white/98 shadow-[inset_0_2px_8px_rgba(255,255,255,0.95)]" />

                            {/* Icon */}
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white relative z-10" />

                            {/* Outer glow */}
                            <div className={`absolute -inset-1.5 sm:-inset-2 ${item.color.split(' ')[0].replace('from-', '')} rounded-3xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-300`} />
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
                            <Sparkles className={`w-3 h-3 sm:w-4 sm:h-4 ${item.color.split(' ')[0].replace('from-', 'text-')}`} />
                          </motion.div>
                        </div>
                        <span className={`text-xs sm:text-sm lg:text-base font-semibold bg-gradient-to-b ${item.color.replace('from-', 'from-').replace('to-', 'to-')} bg-clip-text text-transparent transition-colors line-clamp-1 opacity-90`}>
                          {item.label}
                        </span>
                      </div>

                      {/* Bottom highlight */}
                      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-transparent group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}