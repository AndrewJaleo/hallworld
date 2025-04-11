import React, { useRef, useEffect, useState } from 'react';

interface CountrySelectorProps {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}

export function CountrySelector({ items, selected, onSelect }: CountrySelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [internalSelected, setInternalSelected] = useState(selected);

  // Update internal state when external selection changes
  useEffect(() => {
    setInternalSelected(selected);
  }, [selected]);

  // Center the selected item when it changes externally
  useEffect(() => {
    if (isScrolling) return; // Skip if user is currently scrolling
    
    const container = containerRef.current;
    if (container) {
      const selectedElement = container.querySelector(`[data-item="${internalSelected}"]`);
      if (selectedElement) {
        const elementTop = (selectedElement as HTMLElement).offsetTop;
        container.scrollTop = elementTop - 16; // Align with selection window
      }
    }
  }, [internalSelected, isScrolling]);

  const handleScroll = () => {
    // Set scrolling state
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to handle selection after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) {
        setIsScrolling(false);
        return;
      }
      
      const containerRect = container.getBoundingClientRect();
      const middleY = containerRect.top + (containerRect.height / 2);
      
      // Find the element closest to the middle
      let closestElement: Element | null = null;
      let closestDistance = Infinity;
      
      items.forEach((item) => {
        const element = container.querySelector(`[data-item="${item}"]`);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementMiddleY = rect.top + (rect.height / 2);
          const distance = Math.abs(elementMiddleY - middleY);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestElement = element;
          }
        }
      });
      
      if (closestElement) {
        // Use type assertion to tell TypeScript this is an Element with getAttribute
        const newSelected = (closestElement as Element).getAttribute('data-item');
        if (newSelected && newSelected !== internalSelected) {
          setInternalSelected(newSelected);
          onSelect(newSelected);
        }
      }
      
      setIsScrolling(false);
    }, 200); // Increased timeout for better stability
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative py-0 flex justify-center">
      <div className="relative h-[64px] w-full rounded-[16px] overflow-hidden bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)]">
        {/* Prismatic edge effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
        
        {/* Center highlight */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[32px] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10" />
          <div className="absolute inset-x-0 top-0 border-t border-cyan-500/20" />
          <div className="absolute inset-x-0 bottom-0 border-t border-cyan-500/20" />
        </div>

        {/* Top fade */}
        <div className="absolute inset-x-0 top-0 h-[16px] bg-gradient-to-b from-transparent to-transparent pointer-events-none z-10" />
        
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-[16px] bg-gradient-to-t from-transparent to-transparent pointer-events-none z-10" />

        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-none"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Top spacer */}
          <div className="h-[16px]" />
          
          {items.map((item) => (
            <div
              key={item}
              data-item={item}
              className="h-[32px] px-4"
            >
              <div 
                className={`h-full flex items-center justify-center transition-all duration-300 ${
                  internalSelected === item 
                    ? 'text-cyan-300 font-medium scale-100 translate-z-0' 
                    : 'text-cyan-100/60 scale-90 -translate-z-10'
                }`}
                style={{
                  transform: internalSelected === item 
                    ? 'translateZ(0) scale(1)' 
                    : 'translateZ(-10px) scale(0.9)',
                  transformStyle: 'preserve-3d',
                  perspective: '500px',
                  textShadow: internalSelected === item ? '0 0 10px rgba(6, 182, 212, 0.5)' : 'none'
                }}
              >
                {item}
              </div>
            </div>
          ))}
          
          {/* Bottom spacer */}
          <div className="h-[16px]" />
        </div>

        {/* Scroll indicator */}
        <div className="absolute right-2 inset-y-0 flex flex-col items-center justify-center gap-1 opacity-60">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-300/80 to-blue-400/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
