import React, { useRef, useEffect, useState } from 'react';

interface CitySelectorProps {
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
}

export function CitySelector({ items, selected, onSelect }: CitySelectorProps) {
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
    
    centerSelectedItem();
  }, [internalSelected, isScrolling]);

  // Function to center the selected item
  const centerSelectedItem = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const selectedElement = container.querySelector(`[data-item="${internalSelected}"]`);
    if (selectedElement) {
      const containerWidth = container.offsetWidth;
      const elementLeft = (selectedElement as HTMLElement).offsetLeft;
      const elementWidth = (selectedElement as HTMLElement).offsetWidth;
      
      // Calculate the scroll position to center the element
      const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
      
      // Smooth scroll to the position
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

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
      const middleX = containerRect.left + (containerRect.width / 2);
      
      // Find the element closest to the middle
      let closestElement: Element | null = null;
      let closestDistance = Infinity;
      
      items.forEach((item) => {
        const element = container.querySelector(`[data-item="${item}"]`);
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementMiddleX = rect.left + (rect.width / 2);
          const distance = Math.abs(elementMiddleX - middleX);
          
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
        } else {
          // Even if the selection didn't change, center the current selection
          centerSelectedItem();
        }
      }
      
      setIsScrolling(false);
    }, 250); // Increased timeout for better stability
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
    <div className="relative pt-3 pb-1">
      {/* Label */}
      <div className="absolute left-3 top-0 px-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full z-10">
        <span className="text-xs font-medium text-cyan-300">Ciudad</span>
      </div>
      
      <div className="relative h-[64px] rounded-[32px] overflow-hidden bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 shadow-[0_4px_15px_rgba(31,38,135,0.15),0_0_10px_rgba(6,182,212,0.2)]">
        {/* Prismatic edge effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
        
        {/* Center highlight */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[100px] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10" />
          <div className="absolute inset-y-0 left-0 border-l border-cyan-500/20" />
          <div className="absolute inset-y-0 right-0 border-l border-cyan-500/20" />
        </div>

        {/* Left fade */}
        <div className="absolute inset-y-0 left-0 w-[30px] bg-gradient-to-r from-transparent to-transparent pointer-events-none z-10" />
        
        {/* Right fade */}
        <div className="absolute inset-y-0 right-0 w-[30px] bg-gradient-to-l from-transparent to-transparent pointer-events-none z-10" />

        <div 
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-x-auto scrollbar-none"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="inline-flex items-center h-full">
            {/* Left spacer - larger to ensure first item can be centered */}
            <div className="w-[calc(50%-50px)] shrink-0" />
            
            {items.map((item) => (
              <div
                key={item}
                data-item={item}
                className="w-[100px] shrink-0 h-full flex items-center justify-center"
              >
                <div 
                  className={`transition-all duration-300 ${
                    internalSelected === item 
                      ? 'text-cyan-300 font-medium' 
                      : 'text-cyan-100/60'
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
            
            {/* Right spacer - larger to ensure last item can be centered */}
            <div className="w-[calc(50%-50px)] shrink-0" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 opacity-60">
          <div className="h-1 w-6 rounded-full bg-gradient-to-r from-cyan-300/80 to-blue-400/80 animate-pulse" />
        </div>
      </div>
    </div>
  );
}