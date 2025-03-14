import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Image, Type, Square, Circle, Palette, Trash2, Plus, Minus,
  Lock, Unlock, BringToFront, SendToBack, Copy, Pencil, Slash, Undo, Redo,
  Droplet
} from 'lucide-react';

// Update the range input styles at the top of the file
const rangeInputStyles = `
  .range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 24px;
    background: transparent;
    cursor: pointer;
    position: relative;
    z-index: 10;
    margin: 0;
    padding: 0;
  }
  
  .range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #06b6d4;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
    position: relative;
    z-index: 20;
    margin-top: -8px; /* Center the thumb on the track */
  }
  
  .range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #06b6d4;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    cursor: pointer;
    position: relative;
    z-index: 20;
  }
  
  .range-slider:focus {
    outline: none;
  }
  
  .range-slider::-webkit-slider-runnable-track {
    background: transparent;
    height: 2px;
    cursor: pointer;
  }
  
  .range-slider::-moz-range-track {
    background: transparent;
    height: 2px;
    cursor: pointer;
  }
`;

interface ProfileCanvasProps {
  userId: string;
  isOwner: boolean;
  isEditing: boolean;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  canvasHistory: string[];
  setCanvasHistory: (history: string[]) => void;
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
}

// Add constants for the canvas dimensions
const CANVAS_ASPECT_RATIO = 2/3; // 2:3 aspect ratio (taller, portrait orientation)
const MAX_CANVAS_WIDTH = 800;
const MAX_CANVAS_HEIGHT = 1200; // Maximum height for the canvas
const CANVAS_PADDING = 32;

export function ProfileCanvas({ 
  userId, 
  isOwner, 
  isEditing, 
  isLoading, 
  setIsLoading,
  canvasHistory,
  setCanvasHistory,
  historyIndex,
  setHistoryIndex
}: ProfileCanvasProps) {
  // Use a ref for the container instead of directly referencing the canvas
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { canvas, setCanvas } = useProfileStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [isFillMode, setIsFillMode] = useState(false);
  
  // Add refs for the popovers
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const brushSettingsRef = useRef<HTMLDivElement>(null);
  
  // Add a ref to track canvas initialization attempts
  const initAttemptsRef = useRef(0);
  const MAX_INIT_ATTEMPTS = 3;

  // Add a ref to track if we've already loaded the canvas state
  const hasLoadedCanvasState = useRef(false);

  // Add a ref to track if we're currently initializing the canvas
  const isInitializingRef = useRef(false);
  
  // Track if component is mounted
  const isMountedRef = useRef(false);

  // Track window size for responsive layout
  useEffect(() => {
    const handleWindowResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);
  
  // Set mounted ref on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Define loadCanvasState before it's used
  const loadCanvasState = useCallback(async () => {
    if (!canvas) {
      console.error('Cannot load: Canvas is null');
      return;
    }
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.error('Cannot load: Component is unmounted');
      return;
    }
    
    // Check if canvas has a valid context
    try {
      if (!canvas.getContext()) {
        console.error('Cannot load: Canvas context is not available');
        return;
      }
    } catch (contextError) {
      console.error('Error checking canvas context:', contextError);
      return;
    }
    
    if (!userId) {
      console.error('Cannot load: User ID is missing');
      return;
    }
    
    setIsLoading(true);
    console.log('Loading canvas state from database for user:', userId);
    
    try {
      // Fetch data from Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('canvas_state')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Check again if component is mounted
      if (!isMountedRef.current) {
        console.error('Component unmounted during data fetch');
        return;
      }
      
      if (data?.canvas_state) {
        console.log('Canvas data found, parsing...');
        
        // Validate the canvas state before loading
        let canvasState;
        try {
          // Handle different formats of canvas_state
          if (typeof data.canvas_state === 'string') {
            // Try to parse the string as JSON
            canvasState = JSON.parse(data.canvas_state);
            console.log('Successfully parsed canvas_state string');
          } else {
            // If it's already an object, use it directly
            canvasState = data.canvas_state;
            console.log('Using canvas_state object directly');
          }
          
          // Verify that the parsed data has the expected structure
          if (!canvasState.objects || !Array.isArray(canvasState.objects)) {
            console.warn('Canvas state has unexpected structure:', canvasState);
            // Try to fix the structure if possible
            if (!canvasState.objects && canvasState.version) {
              console.log('Attempting to fix canvas structure...');
            } else {
              throw new Error('Invalid canvas structure');
            }
          }
        } catch (parseError) {
          console.error('Error parsing canvas state:', parseError);
          console.error('Raw canvas_state:', data.canvas_state);
          throw new Error('Corrupted canvas data');
        }
        
        // Double-check that canvas is still available before loading
        if (!canvas || !isMountedRef.current) {
          console.error('Canvas became null or component unmounted during loading process');
          throw new Error('Canvas is no longer available or component unmounted');
        }
        
        // Load the canvas state with error handling
        try {
          console.log('Loading canvas from JSON...');
          
          // Check if canvas is still valid before clearing
          if (!canvas || !canvas.getContext()) {
            console.error('Canvas or canvas context is null before loading JSON');
            throw new Error('Canvas context is not available');
          }
          
          // Use try-catch for canvas.clear() operation
          try {
            canvas.clear(); // Clear existing canvas before loading
          } catch (clearError) {
            console.error('Error clearing canvas:', clearError);
            
            // Check if component is still mounted
            if (!isMountedRef.current) {
              console.error('Component unmounted during canvas clear');
              return;
            }
            
            // Try to reinitialize the canvas if clearing fails
            if (containerRef.current && canvasRef.current) {
              console.log('Attempting to reinitialize canvas after clear error');
              
              try {
                // Get container reference
                const container = containerRef.current; // This ensures the type is not null
                
                // Remove the old canvas element completely
                if (canvasRef.current.parentNode) {
                  canvasRef.current.parentNode.removeChild(canvasRef.current);
                }
                
                // Create a new canvas element
                const newCanvasElement = document.createElement('canvas');
                newCanvasElement.id = 'fabric-canvas';
                newCanvasElement.className = 'w-full h-full';
                
                // Check if containerRef.current is not null before appending
                if (container) {
                  container.appendChild(newCanvasElement);
                } else {
                  console.error('Container reference is null, cannot append canvas');
                  return;
                }
                
                // Update the ref
                canvasRef.current = newCanvasElement;
                
                // Create a new fabric canvas
                const fabricCanvas = new fabric.Canvas(newCanvasElement);
                setCanvas(fabricCanvas);
                
                // Exit the current loading attempt - we'll retry when the canvas is reinitialized
                throw new Error('Canvas needed reinitialization');
              } catch (reinitError) {
                console.error('Error reinitializing canvas:', reinitError);
                throw reinitError;
              }
            }
          }
          
          // Double check canvas is still valid after clearing
          if (!canvas || !canvas.getContext() || !isMountedRef.current) {
            console.error('Canvas or canvas context became null after clearing or component unmounted');
            throw new Error('Canvas context was lost after clearing or component unmounted');
          }
          
          // Use a timeout to give React a chance to complete any pending updates
          setTimeout(() => {
            // Check if component is still mounted
            if (!isMountedRef.current) {
              console.error('Component unmounted during timeout');
              return;
            }
            
            try {
              canvas.loadFromJSON(canvasState, () => {
                // Check if component is still mounted
                if (!isMountedRef.current) {
                  console.error('Component unmounted during loadFromJSON callback');
                  return;
                }
                
                // Check if canvas is still valid before rendering
                if (!canvas || !canvas.getContext()) {
                  console.error('Canvas or canvas context became null during loadFromJSON callback');
                  return;
                }
                
                try {
                  canvas.renderAll();
                  console.log('Canvas rendered successfully');
                  
                  // Initialize history with loaded state
                  // Ensure we're storing the state as a string consistently
                  const stateString = typeof canvasState === 'string' 
                    ? canvasState 
                    : JSON.stringify(canvasState);
                    
                  const newHistory = [stateString];
                  setCanvasHistory(newHistory);
                  setHistoryIndex(0);
                  console.log('Canvas loaded from database. History initialized.');
                } catch (renderError) {
                  console.error('Error rendering canvas:', renderError);
                }
              }, (o: any, object: any) => {
                // This is a callback for each object loaded
                if (!isMountedRef.current) return false;
                console.log(`Loaded object: ${object?.type}`);
                return true;
              });
            } catch (loadJsonError) {
              console.error('Error in loadFromJSON:', loadJsonError);
              
              // If component is still mounted, try to recover with empty canvas
              if (isMountedRef.current && canvas) {
                try {
                  // Initialize with empty state
                  const json = JSON.stringify(canvas.toJSON());
                  setCanvasHistory([json]);
                  setHistoryIndex(0);
                } catch (recoveryError) {
                  console.error('Error recovering with empty canvas:', recoveryError);
                }
              }
            }
          }, 0);
        } catch (loadError) {
          console.error('Error loading canvas from JSON:', loadError);
          throw new Error('Failed to load canvas data');
        }
      } else {
        // Check if component is still mounted
        if (!isMountedRef.current || !canvas) {
          console.error('Component unmounted or canvas became null during no-data branch');
          return;
        }
        
        console.log('No saved canvas found, initializing empty canvas.');
        // Initialize empty history with current state
        try {
          canvas.clear(); // Ensure canvas is empty
          const json = JSON.stringify(canvas.toJSON());
          setCanvasHistory([json]);
          setHistoryIndex(0);
          console.log('Empty history initialized.');
        } catch (emptyCanvasError) {
          console.error('Error initializing empty canvas:', emptyCanvasError);
        }
      }
    } catch (error) {
      console.error('Error loading canvas state:', error);
      
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.error('Component unmounted during error handling');
        return;
      }
      
      // Initialize empty history with current state even if there's an error
      try {
        if (canvas) {
          // Check if canvas context is still valid
          if (!canvas.getContext()) {
            console.error('Canvas context is null during error recovery');
            
            // If we have a canvas reference, try to reinitialize after a short delay
            if (containerRef.current && canvasRef.current) {
              console.log('Will attempt to reinitialize canvas after delay');
              
              // Set a timeout to allow the browser to potentially recover the context
              setTimeout(() => {
                // Check if component is still mounted
                if (!isMountedRef.current) return;
                
                try {
                  console.log('Reinitializing canvas after error');
                  
                  // Remove the old canvas element completely
                  if (canvasRef.current && canvasRef.current.parentNode) {
                    canvasRef.current.parentNode.removeChild(canvasRef.current);
                  }
                  
                  // Create a new canvas element
                  const newCanvasElement = document.createElement('canvas');
                  newCanvasElement.id = 'fabric-canvas';
                  newCanvasElement.className = 'w-full h-full';
                  containerRef.current?.appendChild(newCanvasElement);
                  
                  // Update the ref
                  canvasRef.current = newCanvasElement;
                  
                  // Create a new fabric canvas
                  const fabricCanvas = new fabric.Canvas(newCanvasElement);
                  setCanvas(fabricCanvas);
                  
                  // Initialize with empty state
                  const json = JSON.stringify(fabricCanvas.toJSON());
                  setCanvasHistory([json]);
                  setHistoryIndex(0);
                  console.log('Canvas reinitialized after error');
                } catch (reinitError) {
                  console.error('Failed to reinitialize canvas:', reinitError);
                }
              }, 500); // 500ms delay
            }
            return;
          }
          
          // If context is valid, try to clear and initialize empty history
          try {
            canvas.clear(); // Ensure canvas is empty
            const json = JSON.stringify(canvas.toJSON());
            setCanvasHistory([json]);
            setHistoryIndex(0);
            console.log('Error loading canvas. Empty history initialized.');
          } catch (clearError) {
            console.error('Error clearing canvas during recovery:', clearError);
            throw clearError;
          }
        } else {
          console.error('Cannot initialize empty history: Canvas is null');
        }
      } catch (fallbackError) {
        console.error('Failed to initialize empty history:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [canvas, userId, setCanvasHistory, setHistoryIndex, setIsLoading]);

  // Initialize canvas
  useEffect(() => {
    // Skip if there's no container, if canvas already exists,
    // or if we're already initializing
    if (!containerRef.current || canvas || isInitializingRef.current) return;
    
    // Store the container reference for safety
    const currentContainer = containerRef.current;
    
    // Set initialization flag
    isInitializingRef.current = true;
    console.log('Starting canvas initialization process');
    
    // Create a new canvas element first
    const canvasElement = document.createElement('canvas');
    canvasElement.id = 'fabric-canvas';
    canvasElement.className = 'w-full h-full';
    
    // Clear any existing canvas elements from the container
    while (currentContainer.firstChild) {
      currentContainer.removeChild(currentContainer.firstChild);
    }
    
    // Append the new canvas element to the container
    currentContainer.appendChild(canvasElement);
    
    // Update the ref
    canvasRef.current = canvasElement;
    
    const initializeCanvas = () => {
      try {
        console.log(`Initializing canvas (attempt ${initAttemptsRef.current + 1}/${MAX_INIT_ATTEMPTS})...`);
        initAttemptsRef.current += 1;
        
        // Calculate the optimal canvas dimensions based on container width and height
        const availableWidth = Math.min(MAX_CANVAS_WIDTH, window.innerWidth - CANVAS_PADDING);
        const availableHeight = Math.min(MAX_CANVAS_HEIGHT, window.innerHeight - CANVAS_PADDING * 2);
        
        // Determine dimensions while respecting aspect ratio and maximum constraints
        let containerWidth, containerHeight;
        
        // Calculate dimensions based on aspect ratio
        const heightBasedOnWidth = availableWidth / CANVAS_ASPECT_RATIO;
        const widthBasedOnHeight = availableHeight * CANVAS_ASPECT_RATIO;
        
        if (heightBasedOnWidth <= availableHeight) {
          // Width is the limiting factor
          containerWidth = availableWidth;
          containerHeight = heightBasedOnWidth;
        } else {
          // Height is the limiting factor
          containerWidth = widthBasedOnHeight;
          containerHeight = availableHeight;
        }
        
        // Set canvas dimensions
        if (canvasRef.current) {
          canvasRef.current.width = containerWidth;
          canvasRef.current.height = containerHeight;
        } else {
          console.error('Canvas element is null when setting dimensions');
          retryInitialization();
          return;
        }
        
        // Double check the canvas element is still in the DOM
        if (!currentContainer.contains(canvasRef.current)) {
          console.error('Canvas element is no longer in the DOM');
          
          // Re-append it if needed
          currentContainer.appendChild(canvasRef.current);
        }
        
        // Check if the canvas context can be obtained
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) {
          console.error('Failed to get 2D context from canvas element');
          retryInitialization();
          return;
        }
        
        // Initialize fabric canvas directly without StaticCanvas step
        let newCanvas;
        try {
          newCanvas = new fabric.Canvas(canvasRef.current, {
            backgroundColor: '#ffffff',
            preserveObjectStacking: true,
            selection: true,
            selectionColor: 'rgba(100, 100, 255, 0.3)',
            selectionBorderColor: 'rgba(100, 100, 255, 0.8)',
            selectionLineWidth: 1,
            isDrawingMode: false,
            width: containerWidth,
            height: containerHeight
          });
        } catch (canvasError) {
          console.error('Error creating interactive canvas:', canvasError);
          retryInitialization();
          return;
        }

        // Verify the canvas was created successfully
        if (!newCanvas || !newCanvas.getContext()) {
          console.error('Canvas was created but context is not available');
          retryInitialization();
          return;
        }

        // Configure brush
        try {
          if (newCanvas.freeDrawingBrush) {
            newCanvas.freeDrawingBrush.color = brushColor;
            newCanvas.freeDrawingBrush.width = brushSize;
          }
        } catch (brushError) {
          console.error('Error configuring brush:', brushError);
          // Non-critical error, continue
        }
        
        // Handle window resize
        const handleResize = () => {
          try {
            // Calculate new dimensions while maintaining aspect ratio and respecting maximums
            const availableWidth = Math.min(MAX_CANVAS_WIDTH, window.innerWidth - CANVAS_PADDING);
            const availableHeight = Math.min(MAX_CANVAS_HEIGHT, window.innerHeight - CANVAS_PADDING * 2);
            
            // Determine dimensions while respecting aspect ratio and maximum constraints
            let newWidth, newHeight;
            
            // Calculate dimensions based on aspect ratio
            const heightBasedOnWidth = availableWidth / CANVAS_ASPECT_RATIO;
            const widthBasedOnHeight = availableHeight * CANVAS_ASPECT_RATIO;
            
            if (heightBasedOnWidth <= availableHeight) {
              // Width is the limiting factor
              newWidth = availableWidth;
              newHeight = heightBasedOnWidth;
            } else {
              // Height is the limiting factor
              newWidth = widthBasedOnHeight;
              newHeight = availableHeight;
            }
            
            // Update canvas dimensions
            newCanvas.setWidth(newWidth);
            newCanvas.setHeight(newHeight);
            
            // Scale canvas content to fit new dimensions
            const scaleX = newWidth / newCanvas.getWidth();
            const scaleY = newHeight / newCanvas.getHeight();
            const objects = newCanvas.getObjects();
            
            for (const obj of objects) {
              // Check if properties exist before accessing them
              if (obj.scaleX !== undefined) obj.scaleX *= scaleX;
              if (obj.scaleY !== undefined) obj.scaleY *= scaleY;
              if (obj.left !== undefined) obj.left *= scaleX;
              if (obj.top !== undefined) obj.top *= scaleY;
              obj.setCoords();
            }
            
            newCanvas.renderAll();
            console.log(`Canvas resized to ${newWidth}x${newHeight}`);
          } catch (resizeError) {
            console.error('Error during canvas resize:', resizeError);
          }
        };

        window.addEventListener('resize', handleResize);
        console.log('Canvas initialized successfully');
        
        // Reset initialization attempts on success
        initAttemptsRef.current = 0;
        
        // Reset the initialization flag
        isInitializingRef.current = false;
        
        // Update the canvas in the store
        setCanvas(newCanvas);

        return () => {
          window.removeEventListener('resize', handleResize);
          
          // Reset the initialization flag when the component unmounts
          isInitializingRef.current = false;
          console.log('Canvas initialization flag reset during cleanup');
          
          // If canvas was set in the store, clean it up when the component unmounts
          if (newCanvas) {
            try {
              // Remove all event listeners
              newCanvas.off();
              
              // Dispose the canvas
              newCanvas.dispose();
              
              console.log('Canvas disposed properly during cleanup');
            } catch (disposeError) {
              console.error('Error disposing canvas during cleanup:', disposeError);
            }
          }
        };
      } catch (error) {
        console.error('Error initializing canvas:', error);
        retryInitialization();
      }
    };
    
    // Function to retry initialization with exponential backoff
    const retryInitialization = () => {
      if (initAttemptsRef.current < MAX_INIT_ATTEMPTS) {
        const delay = Math.pow(2, initAttemptsRef.current) * 500; // Exponential backoff: 500ms, 1000ms, 2000ms
        console.log(`Will retry canvas initialization in ${delay}ms`);
        setTimeout(initializeCanvas, delay);
      } else {
        console.error(`Failed to initialize canvas after ${MAX_INIT_ATTEMPTS} attempts`);
        // Reset attempts for future tries
        initAttemptsRef.current = 0;
        // Reset initialization flag
        isInitializingRef.current = false;
        console.log('Canvas initialization flag reset after max attempts');
      }
    };
    
    // Start initialization
    initializeCanvas();
    
    // Cleanup function for the useEffect
    return () => {
      // Reset the initialization flag when the component unmounts
      isInitializingRef.current = false;
      console.log('Canvas initialization flag reset during cleanup');
      
      // If canvas was set in the store, clean it up when the component unmounts
      if (canvas) {
        try {
          // Remove all event listeners
          (canvas as fabric.Canvas).off();
          
          // Dispose the canvas
          (canvas as fabric.Canvas).dispose();
          
          // Clear the canvas from the store
          setCanvas(null);
          
          console.log('Canvas cleaned up during component unmount');
        } catch (error) {
          console.error('Error cleaning up canvas during unmount:', error);
        }
      }
    };
  }, [canvas, brushColor, brushSize, setCanvas]);

  // Add a new useEffect to load canvas state when canvas is available
  useEffect(() => {
    // Only load canvas state when canvas is available and userId exists
    // and we haven't already loaded it
    if (canvas && userId && !hasLoadedCanvasState.current) {
      // Check if canvas is valid before loading
      try {
        if (!canvas.getContext()) {
          console.error('Canvas context is not available before loading state');
          
          // If canvas is invalid, try to reinitialize it
          if (canvasRef.current && initAttemptsRef.current < MAX_INIT_ATTEMPTS) {
            console.log('Canvas context lost, will attempt to reinitialize');
            // Reset canvas to trigger reinitialization
            setCanvas(null);
            // Wait a bit before next attempt
            setTimeout(() => {
              // This will trigger the canvas initialization useEffect again
              initAttemptsRef.current = 0;
            }, 500);
            return;
          }
        }
        
        // Canvas is valid, proceed with loading
        console.log('Loading canvas state for the first time');
        hasLoadedCanvasState.current = true;
        loadCanvasState();
      } catch (error) {
        console.error('Error checking canvas before loading state:', error);
      }
    }
    
    // Reset the flag when the component unmounts or when userId changes
    return () => {
      if (userId) {
        console.log('Resetting canvas state load flag for next time');
        hasLoadedCanvasState.current = false;
      }
    };
  }, [canvas, userId, loadCanvasState, canvasRef, initAttemptsRef, MAX_INIT_ATTEMPTS, setCanvas]);

  // Update drawing mode when it changes
  useEffect(() => {
    if (!canvas) return;
    canvas.isDrawingMode = isDrawingMode;
    
    // If entering drawing mode, deselect any selected objects
    if (isDrawingMode && selectedObject) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setSelectedObject(null);
    }
  }, [isDrawingMode, canvas]);

  // Update brush settings when they change
  useEffect(() => {
    if (!canvas || !canvas.freeDrawingBrush || !isMountedRef.current) return;
    
    try {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
    } catch (error) {
      console.error('Error updating brush settings:', error);
    }
  }, [brushColor, brushSize, canvas]);

  // Add current canvas state to history
  const addToHistory = useCallback(() => {
    if (!canvas) {
      console.warn('Cannot add to history: Canvas is null');
      return;
    }
    
    try {
      // Get current canvas state with specific properties to reduce size
      const canvasJSON = canvas.toJSON([
        'id', 'selectable', 'lockMovementX', 'lockMovementY',
        'lockRotation', 'lockScalingX', 'lockScalingY'
      ]);
      
      // Serialize with error handling
      const json = JSON.stringify(canvasJSON);
      
      // Prevent adding identical states to history
      const currentLastState = canvasHistory[historyIndex];
      if (currentLastState === json) {
        console.log('State unchanged, not adding to history');
        return;
      }
      
      // If we're not at the end of the history, remove everything after current index
      let newHistory = canvasHistory;
      if (historyIndex < canvasHistory.length - 1) {
        newHistory = canvasHistory.slice(0, historyIndex + 1);
      }
      
      // Limit history size to prevent memory issues (keep last 50 states)
      const MAX_HISTORY_SIZE = 50;
      if (newHistory.length >= MAX_HISTORY_SIZE) {
        newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_SIZE + 1);
      }
      
      // Add new state to history
      newHistory = [...newHistory, json];
      
      // Update state
      setCanvasHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Log for debugging
      console.log(`Added to history. New index: ${newHistory.length - 1}, History length: ${newHistory.length}`);
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  }, [canvas, canvasHistory, historyIndex, setCanvasHistory, setHistoryIndex]);

  // Set up canvas event listeners
  useEffect(() => {
    if (!canvas || !isMountedRef.current) return;

    // Use setTimeout to ensure React's rendering is complete
    const setupTimeout = setTimeout(() => {
      if (!canvas || !isMountedRef.current) return;
      
      console.log('Setting up canvas event listeners');
      
      const handleSelection = () => {
        if (!isMountedRef.current) return;
        setSelectedObject(canvas.getActiveObject());
      };

      const handleClearSelection = () => {
        if (!isMountedRef.current) return;
        setSelectedObject(null);
      };

      const handleObjectModified = () => {
        if (!isMountedRef.current) return;
        // Add to history when object is modified
        console.log('Object modified, adding to history');
        addToHistory();
      };

      // Add path created event for drawing
      const handlePathCreated = (e: any) => {
        if (!isMountedRef.current) return;
        console.log('Path created, adding to history');
        addToHistory();
      };

      // Add object added event
      const handleObjectAdded = (e: any) => {
        if (!isMountedRef.current) return;
        // Don't add to history for path objects (they trigger path:created)
        if (e.target && e.target.type !== 'path') {
          console.log(`Object added (${e.target.type}), adding to history`);
          addToHistory();
        }
      };

      canvas.on('selection:created', handleSelection);
      canvas.on('selection:updated', handleSelection);
      canvas.on('selection:cleared', handleClearSelection);
      canvas.on('object:modified', handleObjectModified);
      canvas.on('path:created', handlePathCreated);
      canvas.on('object:added', handleObjectAdded);
      
      console.log('Canvas event listeners set up successfully');
    }, 50); // 50ms delay

    return () => {
      clearTimeout(setupTimeout);
      
      if (canvas) {
        try {
          canvas.off('selection:created');
          canvas.off('selection:updated');
          canvas.off('selection:cleared');
          canvas.off('object:modified');
          canvas.off('path:created');
          canvas.off('object:added');
          console.log('Canvas event listeners cleaned up');
        } catch (error) {
          console.error('Error removing canvas event listeners:', error);
        }
      }
    };
  }, [canvas, addToHistory, isMountedRef]);

  // Undo/Redo functions
  const undo = () => {
    console.log(`Undo called. Current index: ${historyIndex}, History length: ${canvasHistory.length}`);
    
    if (!canvas) {
      console.warn('Cannot undo: Canvas is null');
      return;
    }
    
    if (historyIndex <= 0) {
      console.log('Cannot undo: At beginning of history');
      return;
    }
    
    if (canvasHistory.length === 0) {
      console.log('Cannot undo: History is empty');
      return;
    }
    
    const newIndex = historyIndex - 1;
    console.log(`Undoing to index ${newIndex}`);
    
    try {
      // Validate the history state before loading
      let historyState;
      try {
        // If it's a string, parse it to ensure it's valid JSON
        if (typeof canvasHistory[newIndex] === 'string') {
          historyState = JSON.parse(canvasHistory[newIndex]);
        } else {
          historyState = canvasHistory[newIndex];
        }
      } catch (parseError) {
        console.error('Error parsing history state:', parseError);
        throw new Error('Corrupted history data');
      }
      
      // Load the canvas state with proper error handling
      canvas.loadFromJSON(historyState, () => {
        canvas.renderAll();
        setHistoryIndex(newIndex);
        console.log(`Undo successful. New index: ${newIndex}`);
      });
    } catch (error) {
      console.error('Error during undo:', error);
      // If there's an error, try to recover by removing the corrupted state
      if (canvasHistory.length > 1) {
        const newHistory = [...canvasHistory];
        newHistory.splice(newIndex, 1);
        setCanvasHistory(newHistory);
        setHistoryIndex(Math.min(newIndex, newHistory.length - 1));
        console.log('Removed corrupted history state and attempted recovery');
      }
    }
  };

  const redo = () => {
    console.log(`Redo called. Current index: ${historyIndex}, History length: ${canvasHistory.length}`);
    
    if (!canvas) {
      console.warn('Cannot redo: Canvas is null');
      return;
    }
    
    if (historyIndex >= canvasHistory.length - 1) {
      console.log('Cannot redo: At end of history');
      return;
    }
    
    if (canvasHistory.length === 0) {
      console.log('Cannot redo: History is empty');
      return;
    }
    
    const newIndex = historyIndex + 1;
    console.log(`Redoing to index ${newIndex}`);
    
    try {
      // Validate the history state before loading
      let historyState;
      try {
        // If it's a string, parse it to ensure it's valid JSON
        if (typeof canvasHistory[newIndex] === 'string') {
          historyState = JSON.parse(canvasHistory[newIndex]);
        } else {
          historyState = canvasHistory[newIndex];
        }
      } catch (parseError) {
        console.error('Error parsing history state:', parseError);
        throw new Error('Corrupted history data');
      }
      
      // Load the canvas state with proper error handling
      canvas.loadFromJSON(historyState, () => {
        canvas.renderAll();
        setHistoryIndex(newIndex);
        console.log(`Redo successful. New index: ${newIndex}`);
      });
    } catch (error) {
      console.error('Error during redo:', error);
      // If there's an error, try to recover by removing the corrupted state
      if (canvasHistory.length > 1) {
        const newHistory = [...canvasHistory];
        newHistory.splice(newIndex, 1);
        setCanvasHistory(newHistory);
        setHistoryIndex(Math.min(historyIndex, newHistory.length - 1));
        console.log('Removed corrupted history state and attempted recovery');
      }
    }
  };

  const addText = () => {
    if (!canvas) return;
    const text = new fabric.IText('Doble click para editar', {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    // History will be added by the object:added event listener
  };

  const addShape = (type: 'rect' | 'circle') => {
    if (!canvas) return;
    const shape = type === 'rect'
      ? new fabric.Rect({
          left: 50,
          top: 50,
          width: 100,
          height: 100,
          fill: '#4F46E5'
        })
      : new fabric.Circle({
          left: 50,
          top: 50,
          radius: 50,
          fill: '#4F46E5'
        });
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    // History will be added by the object:added event listener
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.[0]) {
      console.log('No canvas or no files selected');
      return;
    }

    console.log('File selected:', e.target.files[0].name);
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target?.result) {
        console.log('FileReader result is null');
        return;
      }
      
      console.log('File loaded, creating image');
      const imgUrl = event.target.result.toString();
      
      // Use fabric.Image.fromURL instead of creating an HTML element
      fabric.Image.fromURL(imgUrl, (fabricImage) => {
        console.log('Image created, dimensions:', fabricImage.width, 'x', fabricImage.height);
        
        // Position the image
        fabricImage.set({
          left: 50,
          top: 50
        });
        
        // Scale the image to a reasonable size
        fabricImage.scaleToWidth(200);
        
        // Add the image to the canvas
        canvas.add(fabricImage);
        canvas.setActiveObject(fabricImage);
        canvas.renderAll();
        console.log('Image added to canvas');
        
        // Clear the file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, {
        crossOrigin: 'anonymous'
      });
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };
    
    reader.readAsDataURL(file);
  };

  const handleColorChange = (color: string) => {
    if (isDrawingMode) {
      // In drawing mode, update brush color
      setBrushColor(color);
    } else if (selectedObject && canvas) {
      // In selection mode, update selected object color
      selectedObject.set('fill', color);
      canvas.renderAll();
    }
  };

  const deleteSelected = () => {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
    console.log('Object deleted, adding to history');
    addToHistory(); // Need to explicitly add to history since there's no object:removed event
  };

  const toggleLock = () => {
    if (!selectedObject) return;
    selectedObject.set('lockMovementX', !selectedObject.lockMovementX);
    selectedObject.set('lockMovementY', !selectedObject.lockMovementY);
    canvas?.renderAll();
    console.log('Object locked/unlocked, adding to history');
    addToHistory(); // Need to explicitly add to history since lock changes don't trigger object:modified
  };

  const adjustLayer = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (!selectedObject || !canvas) return;
    
    switch (direction) {
      case 'forward':
        selectedObject.bringForward();
        break;
      case 'backward':
        selectedObject.sendBackwards();
        break;
      case 'front':
        selectedObject.bringToFront();
        break;
      case 'back':
        selectedObject.sendToBack();
        break;
    }
    
    canvas.renderAll();
    console.log('Layer adjusted, adding to history');
    addToHistory(); // Need to explicitly add to history since layer changes don't trigger object:modified
  };

  const duplicateSelected = () => {
    if (!canvas || !selectedObject) return;
    
    selectedObject.clone((cloned: fabric.Object) => {
      cloned.set({
        left: selectedObject.left! + 20,
        top: selectedObject.top! + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      // History will be added by the object:added event listener
    });
  };

  const exportCanvas = () => {
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    // Use a simpler approach without DOM manipulation
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    
    // Use click() directly without appending to DOM
    link.click();
  };

  // Add a useEffect to handle clicks outside the popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle color picker
      if (showColorPicker && 
          colorPickerRef.current && 
          !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      
      // Handle brush settings
      if (showBrushSettings && 
          brushSettingsRef.current && 
          !brushSettingsRef.current.contains(event.target as Node) &&
          // Don't close brush settings when clicking the pencil button
          !(event.target as Element).closest('[data-brush-toggle]')) {
        setShowBrushSettings(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker, showBrushSettings]);

  // Update the toggleDrawingMode function to handle brush settings better
  const toggleDrawingMode = () => {
    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);
    
    // Only show brush settings when entering drawing mode
    if (newDrawingMode) {
      setShowBrushSettings(true);
    } else {
      setShowBrushSettings(false);
    }
  };

  // Add a useEffect to initialize history when the component mounts
  useEffect(() => {
    // Log history state for debugging
    console.log(`Canvas history state: Index: ${historyIndex}, Length: ${canvasHistory.length}`);
  }, [historyIndex, canvasHistory]);

  // Add a useEffect to ensure history is initialized when canvas is ready
  useEffect(() => {
    // Only initialize history if canvas is ready and history is empty
    if (canvas && canvasHistory.length === 0) {
      try {
        console.log('Canvas ready but history empty, initializing history');
        
        // Check if canvas context is valid
        if (!canvas.getContext()) {
          console.error('Canvas context is not available when initializing history');
          return;
        }
        
        // Create a safe copy of the canvas state
        const canvasJSON = canvas.toJSON();
        const json = JSON.stringify(canvasJSON);
        
        // Update history in a safe way
        const newHistory = [json];
        setCanvasHistory(newHistory);
        setHistoryIndex(0);
        
        console.log('History initialized with empty canvas state');
      } catch (error) {
        console.error('Error initializing history:', error);
      }
    }
  }, [canvas, canvasHistory.length, setCanvasHistory, setHistoryIndex]);

  // Add fill functionality
  const activateFillMode = () => {
    if (!canvas) return;
    
    // Disable drawing mode if it's active
    if (isDrawingMode) {
      setIsDrawingMode(false);
    }
    
    // Toggle fill mode
    setIsFillMode(!isFillMode);
  };

  // Handle fill operation when canvas is clicked in fill mode
  useEffect(() => {
    if (!canvas || !isFillMode) return;

    const handleCanvasClick = (options: any) => {
      // Get click coordinates
      const pointer = canvas.getPointer(options.e);
      const x = Math.round(pointer.x);
      const y = Math.round(pointer.y);
      
      // Get the current fill color
      const fillColor = brushColor;
      
      console.log(`Fill operation at (${x}, ${y}) with color ${fillColor}`);
      
      // Create a new rect that covers the entire canvas
      const rect = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width,
        height: canvas.height,
        fill: fillColor,
        selectable: true
      });
      
      // Add the rectangle to the canvas
      canvas.add(rect);
      
      // Send it to the back so it becomes the background
      rect.sendToBack();
      
      // Render the canvas
      canvas.renderAll();
      
      // Add to history
      addToHistory();
    };

    // Add event listener for mouse down
    canvas.on('mouse:down', handleCanvasClick);
    
    // Return cleanup function
    return () => {
      if (canvas) {
        canvas.off('mouse:down', handleCanvasClick);
      }
    };
  }, [canvas, isFillMode, brushColor, addToHistory]);

  // Update cursor based on active mode
  useEffect(() => {
    if (!canvas) return;
    
    if (isFillMode) {
      canvas.defaultCursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><path d=\'M12 19l7-7 3 3-7 7-3-3z\'/><path d=\'M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z\'/><path d=\'M2 2l7.586 7.586\'/><circle cx=\'11\' cy=\'11\' r=\'2\'/></svg>"), auto';
    } else if (isDrawingMode) {
      canvas.defaultCursor = 'crosshair';
    } else {
      canvas.defaultCursor = 'default';
    }
  }, [canvas, isFillMode, isDrawingMode]);

  // Disable fill mode when drawing mode is activated
  useEffect(() => {
    if (isDrawingMode && isFillMode) {
      setIsFillMode(false);
    }
  }, [isDrawingMode, isFillMode]);

  return (
    <div className="relative">
      {/* Add style tag for range input styling */}
      <style>{rangeInputStyles}</style>
      
      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
        id="file-input"
      />
      
      {/* Canvas container - updated for better mobile centering */}
      <div className="w-full flex justify-center px-0 sm:px-4">
        <div 
          className={`relative rounded-2xl overflow-hidden ${isEditing ? 'border-2 border-dashed border-cyan-300' : ''}`} 
          style={{ 
            zIndex: 0,
            width: '100%',
            maxWidth: `${MAX_CANVAS_WIDTH}px`,
            maxHeight: `${MAX_CANVAS_HEIGHT}px`,
            aspectRatio: `${CANVAS_ASPECT_RATIO}`,
            marginBottom: isEditing && isMobile ? '70px' : '0'
          }}
          id="canvas-container"
          ref={containerRef}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          )}
          {/* The canvas element will be created and appended programmatically */}
        </div>
      </div>

      {/* Toolbar - Desktop (vertical) */}
      {isEditing && isOwner && !isMobile && (
        <div className="absolute left-4 top-2 flex flex-col gap-2 z-30">
          <motion.div
            className="relative overflow-hidden rounded-xl p-2 flex flex-col gap-2 shadow-lg bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ zIndex: 50 }}
          >
            {/* Prismatic edge effect */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
            
            {/* Toolbar buttons for desktop */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Subir imagen"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              onClick={addText}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Añadir texto"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('rect')}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Añadir rectángulo"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('circle')}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Añadir círculo"
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDrawingMode}
              className={`relative overflow-hidden rounded-full backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 ${isDrawingMode ? 'bg-cyan-600/50 ring-2 ring-cyan-400' : 'bg-cyan-800/30'}`}
              title={isDrawingMode ? "Desactivar modo dibujo" : "Activar modo dibujo"}
              data-brush-toggle="true"
            >
              {isDrawingMode ? <Slash className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
            <button
              onClick={activateFillMode}
              className={`relative overflow-hidden rounded-full backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 ${isFillMode ? 'bg-cyan-600/50 ring-2 ring-cyan-400' : 'bg-cyan-800/30'}`}
              title={isFillMode ? "Desactivar modo relleno" : "Activar modo relleno"}
            >
              <Droplet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Color"
              style={{ 
                backgroundColor: (isDrawingMode || isFillMode) ? brushColor : 'transparent',
                color: (isDrawingMode || isFillMode) && brushColor !== '#ffffff' ? 'white' : 'cyan-300'
              }}
            >
              <Palette className="w-5 h-5" />
            </button>
            
            {/* Add undo/redo buttons */}
            <div className="border-t border-cyan-500/20 my-1 pt-1"></div>
            <button
              onClick={undo}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Deshacer"
              disabled={historyIndex <= 0}
              style={{ opacity: historyIndex <= 0 ? 0.5 : 1 }}
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
              title="Rehacer"
              disabled={historyIndex >= canvasHistory.length - 1}
              style={{ opacity: historyIndex >= canvasHistory.length - 1 ? 0.5 : 1 }}
            >
              <Redo className="w-5 h-5" />
            </button>
          </motion.div>

          {selectedObject && !isDrawingMode && (
            <motion.div
              className="relative overflow-hidden rounded-xl p-2 flex flex-col gap-2 shadow-lg bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ zIndex: 50 }}
            >
              {/* Prismatic edge effect */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
              
              <button
                onClick={deleteSelected}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-red-500"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={duplicateSelected}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                title="Duplicar"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={toggleLock}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
                title="Bloquear/Desbloquear"
              >
                {selectedObject.lockMovementX ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => adjustLayer('forward')}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                title="Traer adelante"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustLayer('backward')}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                title="Enviar atrás"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustLayer('front')}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                title="Traer al frente"
              >
                <BringToFront className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustLayer('back')}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                title="Enviar al fondo"
              >
                <SendToBack className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Brush settings panel */}
          <AnimatePresence>
            {showBrushSettings && isDrawingMode && (
              <motion.div
                ref={brushSettingsRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-16 top-20 relative overflow-hidden rounded-xl p-5 shadow-lg bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20"
                style={{ zIndex: 60, width: '280px' }}
              >
                {/* Prismatic edge effect */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-cyan-300">Ajustes de pincel</h3>
                  
                  {/* Brush preview */}
                  <div className="flex items-center justify-center p-3 bg-cyan-800/30 rounded-lg border border-cyan-500/20">
                    <div 
                      className="rounded-full border border-cyan-500/20 shadow-sm"
                      style={{ 
                        width: `${Math.min(brushSize * 2, 100)}px`, 
                        height: `${Math.min(brushSize * 2, 100)}px`,
                        backgroundColor: brushColor,
                        transition: 'all 0.2s ease'
                      }}
                    ></div>
                  </div>
                  
                  {/* Brush size slider */}
                  <div>
                    <label className="block text-sm font-medium text-cyan-300 mb-2">Tamaño del pincel</label>
                    <div className="relative h-6 flex items-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="h-1 w-full bg-cyan-500/20 rounded"></div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="range-slider"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-cyan-400 mt-1">
                      <span>1px</span>
                      <span>{brushSize}px</span>
                      <span>50px</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Toolbar - Mobile (horizontal) */}
      {isEditing && isOwner && isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-cyan-900/20 backdrop-blur-xl p-2 flex justify-center z-30 border-t border-cyan-500/20">
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Subir imagen"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              onClick={addText}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Añadir texto"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('rect')}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Añadir rectángulo"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('circle')}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Añadir círculo"
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDrawingMode}
              className={`relative overflow-hidden rounded-full backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0 ${isDrawingMode ? 'bg-cyan-600/50 ring-2 ring-cyan-400' : 'bg-cyan-800/30'}`}
              title={isDrawingMode ? "Desactivar modo dibujo" : "Activar modo dibujo"}
              data-brush-toggle="true"
            >
              {isDrawingMode ? <Slash className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
            <button
              onClick={activateFillMode}
              className={`relative overflow-hidden rounded-full backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0 ${isFillMode ? 'bg-cyan-600/50 ring-2 ring-cyan-400' : 'bg-cyan-800/30'}`}
              title={isFillMode ? "Desactivar modo relleno" : "Activar modo relleno"}
            >
              <Droplet className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Color"
              style={{ 
                backgroundColor: (isDrawingMode || isFillMode) ? brushColor : 'transparent',
                color: (isDrawingMode || isFillMode) && brushColor !== '#ffffff' ? 'white' : 'cyan-300'
              }}
            >
              <Palette className="w-5 h-5" />
            </button>
            
            {/* Add undo/redo buttons */}
            <div className="h-full border-l border-cyan-500/20 mx-1"></div>
            <button
              onClick={undo}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Deshacer"
              disabled={historyIndex <= 0}
              style={{ opacity: historyIndex <= 0 ? 0.5 : 1 }}
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
              title="Rehacer"
              disabled={historyIndex >= canvasHistory.length - 1}
              style={{ opacity: historyIndex >= canvasHistory.length - 1 ? 0.5 : 1 }}
            >
              <Redo className="w-5 h-5" />
            </button>
            
            {selectedObject && !isDrawingMode && (
              <>
                <button
                  onClick={deleteSelected}
                  className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-red-500 flex-shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={duplicateSelected}
                  className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
                  title="Duplicar"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleLock}
                  className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300 flex-shrink-0"
                  title="Bloquear/Desbloquear"
                >
                  {selectedObject.lockMovementX ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
              </button>
              </>
            )}
            
            {/* Mobile brush settings */}
            <AnimatePresence>
              {showBrushSettings && isDrawingMode && isMobile && (
                <motion.div
                  ref={brushSettingsRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-full left-0 right-0 bg-cyan-900/80 backdrop-blur-xl p-4 border-t border-cyan-500/30 rounded-t-xl mb-1"
                  style={{ zIndex: 70 }}
                >
                  {/* Prismatic edge effect */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                  <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                  <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                  
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-cyan-300">Ajustes de pincel</h3>
                      <button 
                        onClick={() => setShowBrushSettings(false)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-800/50 px-2 py-1 rounded-md"
                      >
                        Cerrar
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="rounded-full border border-cyan-500/20 shadow-sm flex-shrink-0"
                        style={{ 
                          width: `${Math.min(brushSize * 1.5, 40)}px`, 
                          height: `${Math.min(brushSize * 1.5, 40)}px`,
                          backgroundColor: brushColor,
                          transition: 'all 0.2s ease'
                        }}
                      ></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-medium text-cyan-300">Tamaño</label>
                          <span className="text-xs font-medium bg-cyan-800/30 px-2 py-0.5 rounded-md text-cyan-300">{brushSize}px</span>
                        </div>
                        <div className="relative h-6 flex items-center">
                          <div className="absolute inset-0 flex items-center">
                            <div className="h-1 w-full bg-cyan-500/20 rounded"></div>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="range-slider"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto pb-1">
                      <div className="flex gap-2 min-w-max">
                        {['#000000', '#ffffff', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
                          '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#10b981', '#14b8a6'].map((color) => (
                            <button
                              key={color}
                              onClick={() => setBrushColor(color)}
                              className={`w-8 h-8 rounded-full transition-all ${brushColor === color ? 'ring-2 ring-offset-1 ring-cyan-400 scale-110' : 'ring-1 ring-cyan-500/20'}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Color ${color}`}
                            />
                          ))}
                        <button
                          onClick={() => {
                            setShowBrushSettings(false);
                            setShowColorPicker(true);
                          }}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-800/30 backdrop-blur-xl border border-cyan-500/20 text-cyan-300 hover:bg-cyan-700/30 transition-colors"
                          aria-label="Custom color"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Color Picker - Desktop Only */}
            <AnimatePresence>
              {showColorPicker && !isMobile && (
                <motion.div
                  ref={colorPickerRef}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-16 top-0 bg-cyan-900/20 backdrop-blur-xl border border-cyan-500/20 p-4 rounded-xl shadow-lg"
                  style={{ zIndex: 70 }}
                >
                  {/* Prismatic edge effect */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent opacity-50" />
                  <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                  <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-cyan-300">Selector de color</h3>
                      <button 
                        onClick={() => setShowColorPicker(false)}
                        className="text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        Cerrar
                      </button>
                    </div>
                    
                    <HexColorPicker
                      color={isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000')}
                      onChange={handleColorChange}
                    />
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-cyan-500/20 shadow-sm" 
                        style={{ backgroundColor: isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000') }}
                      ></div>
                      <input
                        type="text"
                        value={isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000')}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm bg-cyan-800/30 border border-cyan-500/20 rounded-md text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Mobile Color Picker */}
            <AnimatePresence>
              {showColorPicker && isMobile && (
                <motion.div
                  ref={colorPickerRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-full left-0 right-0 bg-cyan-900/80 backdrop-blur-xl p-4 border-t border-cyan-500/30 rounded-t-xl mb-1"
                  style={{ zIndex: 70 }}
                >
                  {/* Prismatic edge effect */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-70" />
                  <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-cyan-300/70 to-transparent opacity-70" />
                  <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent opacity-50" />
                  
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-cyan-300">Selector de color</h3>
                      <button 
                        onClick={() => setShowColorPicker(false)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs bg-cyan-800/50 px-2 py-1 rounded-md"
                      >
                        Cerrar
                      </button>
                    </div>
                    
                    <HexColorPicker
                      color={isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000')}
                      onChange={handleColorChange}
                      className="w-full max-h-[180px]"
                    />
                    
                    <div className="flex items-center gap-2 mt-3">
                      <div 
                        className="w-6 h-6 rounded-full border border-cyan-500/20 shadow-sm" 
                        style={{ backgroundColor: isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000') }}
                      ></div>
                      <input
                        type="text"
                        value={isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000')}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm bg-cyan-800/50 border border-cyan-500/30 rounded-md text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// Export utility functions for parent component to use
export const canvasUtils = {
  exportCanvas: (canvas: fabric.Canvas | null) => {
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1
    });
    
    // Use a simpler approach without DOM manipulation
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    
    // Use click() directly without appending to DOM
    link.click();
  }
}
