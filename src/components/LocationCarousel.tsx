import React from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { MapPin, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface LocationCarouselProps {
  items: string[];
  direction: 'vertical' | 'horizontal';
  title: string;
  selected?: string;
  onSelect?: (item: string) => void;
}

export function LocationCarousel({ items, direction, title, selected, onSelect }: LocationCarouselProps) {
  const [emblaRef] = useEmblaCarousel({
    axis: direction === 'vertical' ? 'y' : 'x',
    dragFree: true,
    align: 'center',
    loop: true
  });

  return (
    <motion.div
      className="relative w-full glossy rounded-lg p-1.5 shadow-lg"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}>
      <div className="flex items-center gap-1 mb-1.5">
        <MapPin className="w-3.5 h-3.5 text-violet-500" strokeWidth={2.5} />
        <span className="text-gray-700 font-semibold text-xs tracking-wide">{title}</span>
        {direction === 'vertical' ? (
          <div className="flex flex-col gap-1 ml-auto">
            <ChevronUp className="w-3 h-3 text-violet-400" />
            <ChevronDown className="w-3 h-3 text-violet-400" />
          </div>
        ) : (
          <div className="flex gap-1 ml-auto">
          <ChevronRight className="w-3 h-3 text-violet-400 ml-auto" />
          </div>
        )}
      </div>
      <div className="embla" ref={emblaRef}>
        <div className={`embla__container ${direction === 'vertical' ? 'flex-col' : ''}`}>
          {items.map((item, index) => (
            <div key={index} className="embla__slide">
              <motion.button
                onClick={() => onSelect && onSelect(item)}
                className={`location-button ${item === selected ? 'selected' : ''}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.2 }}
              >
                {item}
              </motion.button>
              <div className="text-gray-400 text-xs mt-1 text-center">{index + 1} de {items.length}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}