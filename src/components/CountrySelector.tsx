import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search } from 'lucide-react';

interface CountrySelectorProps {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}

export function CountrySelector({ items, selected, onSelect }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass-button p-2.5 flex items-center gap-2 relative"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <MapPin className="w-3.5 h-3.5 text-violet-500" strokeWidth={2.5} />
        <span className="text-gray-700 font-medium text-sm flex-1 text-left">{selected}</span>
        <ChevronDown
          className={`w-4 h-4 text-violet-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 glossy rounded-xl overflow-hidden"
          >
            <div className="p-2 border-b border-violet-100">
              <div className="relative">
                <Search className="w-4 h-4 text-violet-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar país..."
                  className="w-full pl-8 pr-3 py-2 bg-white/60 rounded-lg text-sm outline-none border border-violet-100 focus:border-violet-300 transition-colors"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredItems.map((item) => (
                <motion.button
                  key={item}
                  onClick={() => {
                    onSelect(item);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-violet-50 transition-colors
                    ${item === selected ? 'text-violet-600 font-medium bg-violet-50' : 'text-gray-600'}`}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  {item}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}