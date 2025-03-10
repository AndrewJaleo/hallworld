import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Image, Type, Square, Circle, Palette, Trash2, Plus, Minus,
  Lock, Unlock, BringToFront, SendToBack, Copy, Pencil, Slash, Undo, Redo
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
    background: #4F46E5;
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
    background: #4F46E5;
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
  onSave?: () => void;
  canvasHistory: string[];
  setCanvasHistory: (history: string[]) => void;
  historyIndex: number;
  setHistoryIndex: (index: number) => void;
}

// Add a constant for the canvas aspect ratio
const CANVAS_ASPECT_RATIO = 4/3; // 4:3 aspect ratio
const MAX_CANVAS_WIDTH = 800;
const CANVAS_PADDING = 32;

export function ProfileCanvas({ 
  userId, 
  isOwner, 
  isEditing, 
  isLoading, 
  setIsLoading,
  onSave,
  canvasHistory,
  setCanvasHistory,
  historyIndex,
  setHistoryIndex
}: ProfileCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { canvas, setCanvas } = useProfileStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  
  // Add refs for the popovers
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const brushSettingsRef = useRef<HTMLDivElement>(null);

  // Track window size for responsive layout
  useEffect(() => {
    const handleWindowResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return;
    
    try {
      // Calculate the optimal canvas dimensions based on container width
      const containerWidth = Math.min(MAX_CANVAS_WIDTH, window.innerWidth - CANVAS_PADDING);
      const containerHeight = containerWidth / CANVAS_ASPECT_RATIO;
      
      // Set canvas dimensions
      if (canvasRef.current) {
        canvasRef.current.width = containerWidth;
        canvasRef.current.height = containerHeight;
      }
      
      // Initialize as StaticCanvas first
      const staticCanvas = new fabric.StaticCanvas(canvasRef.current, {
        backgroundColor: '#ffffff'
      });
      
      // Then upgrade to interactive Canvas
      const newCanvas = new fabric.Canvas(canvasRef.current, {
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

      // Configure brush
      if (newCanvas.freeDrawingBrush) {
        newCanvas.freeDrawingBrush.color = brushColor;
        newCanvas.freeDrawingBrush.width = brushSize;
      }
      
      // Handle window resize
      const handleResize = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const newWidth = Math.min(MAX_CANVAS_WIDTH, window.innerWidth - CANVAS_PADDING);
        const newHeight = newWidth / CANVAS_ASPECT_RATIO;
        
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
      };

      window.addEventListener('resize', handleResize);
      setCanvas(newCanvas);

      // Load saved canvas state
      loadCanvasState();

      return () => {
        window.removeEventListener('resize', handleResize);
        newCanvas.dispose();
        setCanvas(null);
      };
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }, []);

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
    if (!canvas || !canvas.freeDrawingBrush) return;
    
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;
  }, [brushColor, brushSize, canvas]);

  // Set up canvas event listeners
  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      setSelectedObject(canvas.getActiveObject());
    };

    const handleClearSelection = () => {
      setSelectedObject(null);
    };

    const handleObjectModified = () => {
      // Add to history when object is modified
      console.log('Object modified, adding to history');
      addToHistory();
    };

    // Add path created event for drawing
    const handlePathCreated = (e: any) => {
      console.log('Path created, adding to history');
      addToHistory();
    };

    // Add object added event
    const handleObjectAdded = (e: any) => {
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

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleClearSelection);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('path:created', handlePathCreated);
      canvas.off('object:added', handleObjectAdded);
    };
  }, [canvas]);

  // Add current canvas state to history
  const addToHistory = () => {
    if (!canvas) return;
    
    // Get current canvas state
    const json = JSON.stringify(canvas.toJSON());
    
    // If we're not at the end of the history, remove everything after current index
    if (historyIndex < canvasHistory.length - 1) {
      setCanvasHistory(canvasHistory.slice(0, historyIndex + 1));
    }
    
    // Add new state to history
    const newHistory = [...canvasHistory, json];
    setCanvasHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Log for debugging
    console.log(`Added to history. New index: ${newHistory.length - 1}, History length: ${newHistory.length}`);
  };

  // Undo/Redo functions
  const undo = () => {
    console.log(`Undo called. Current index: ${historyIndex}, History length: ${canvasHistory.length}`);
    
    if (!canvas || historyIndex <= 0) {
      console.log('Cannot undo: at beginning of history or no canvas');
      return;
    }
    
    const newIndex = historyIndex - 1;
    console.log(`Undoing to index ${newIndex}`);
    
    try {
      canvas.loadFromJSON(canvasHistory[newIndex], () => {
        canvas.renderAll();
        setHistoryIndex(newIndex);
        console.log(`Undo successful. New index: ${newIndex}`);
      });
    } catch (error) {
      console.error('Error during undo:', error);
    }
  };

  const redo = () => {
    console.log(`Redo called. Current index: ${historyIndex}, History length: ${canvasHistory.length}`);
    
    if (!canvas || historyIndex >= canvasHistory.length - 1) {
      console.log('Cannot redo: at end of history or no canvas');
      return;
    }
    
    const newIndex = historyIndex + 1;
    console.log(`Redoing to index ${newIndex}`);
    
    try {
      canvas.loadFromJSON(canvasHistory[newIndex], () => {
        canvas.renderAll();
        setHistoryIndex(newIndex);
        console.log(`Redo successful. New index: ${newIndex}`);
      });
    } catch (error) {
      console.error('Error during redo:', error);
    }
  };

  const loadCanvasState = async () => {
    if (!canvas) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('canvas_state')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data?.canvas_state) {
        canvas.loadFromJSON(data.canvas_state, () => {
          canvas.renderAll();
          // Initialize history with loaded state
          const newHistory = [data.canvas_state];
          setCanvasHistory(newHistory);
          setHistoryIndex(0);
          console.log('Canvas loaded from database. History initialized.');
        });
      } else {
        // Initialize empty history with current state
        const json = JSON.stringify(canvas.toJSON());
        setCanvasHistory([json]);
        setHistoryIndex(0);
        console.log('No saved canvas found. Empty history initialized.');
      }
    } catch (error) {
      console.error('Error loading canvas state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCanvasState = async () => {
    if (!canvas) return;

    setIsLoading(true);
    try {
      const canvasState = JSON.stringify(canvas.toJSON());
      const { error } = await supabase
        .from('profiles')
        .update({ canvas_state: canvasState })
        .eq('id', userId);

      if (error) throw error;
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving canvas state:', error);
    } finally {
      setIsLoading(false);
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
    if (!canvas || !e.target.files?.[0]) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      fabric.Image.fromURL(event.target.result.toString(), (img: fabric.Image) => {
        img.scaleToWidth(200);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        // History will be added by the object:added event listener
      });
    };
    reader.readAsDataURL(e.target.files[0]);
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
    
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (canvas && canvasHistory.length === 0) {
      console.log('Canvas ready but history empty, initializing history');
      const json = JSON.stringify(canvas.toJSON());
      setCanvasHistory([json]);
      setHistoryIndex(0);
    }
  }, [canvas, canvasHistory.length]);

  return (
    <div className="relative">
      {/* Add style tag for range input styling */}
      <style>{rangeInputStyles}</style>
      
      {/* Canvas container - updated for better mobile centering */}
      <div className="w-full flex justify-center px-0 sm:px-4">
        <div 
          className={`relative rounded-2xl overflow-hidden ${isEditing ? 'border-2 border-dashed border-violet-300' : ''}`} 
          style={{ 
            zIndex: 0,
            width: '100%',
            maxWidth: `${MAX_CANVAS_WIDTH}px`,
            aspectRatio: `${CANVAS_ASPECT_RATIO}`,
            marginBottom: isEditing && isMobile ? '70px' : '0'
          }}
          id="canvas-container"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            id="fabric-canvas"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Toolbar - Desktop (vertical) */}
      {isEditing && isOwner && !isMobile && (
        <div className="absolute left-4 top-2 flex flex-col gap-2 z-30">
          <motion.div
            className="glossy p-2 rounded-xl flex flex-col gap-2 shadow-lg"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ zIndex: 50 }}
          >
            {/* Toolbar buttons for desktop */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-button p-2"
              title="Subir imagen"
            >
              <Image className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={addText}
              className="glass-button p-2"
              title="Añadir texto"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('rect')}
              className="glass-button p-2"
              title="Añadir rectángulo"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('circle')}
              className="glass-button p-2"
              title="Añadir círculo"
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDrawingMode}
              className={`glass-button p-2 ${isDrawingMode ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
              title={isDrawingMode ? "Desactivar modo dibujo" : "Activar modo dibujo"}
              data-brush-toggle="true"
            >
              {isDrawingMode ? <Slash className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="glass-button p-2"
              title="Color"
              style={{ 
                backgroundColor: isDrawingMode ? brushColor : 'transparent',
                color: isDrawingMode && brushColor !== '#ffffff' ? 'white' : 'black'
              }}
            >
              <Palette className="w-5 h-5" />
            </button>
            
            {/* Add undo/redo buttons */}
            <div className="border-t border-gray-200 my-1 pt-1"></div>
            <button
              onClick={undo}
              className="glass-button p-2"
              title="Deshacer"
              disabled={historyIndex <= 0}
              style={{ opacity: historyIndex <= 0 ? 0.5 : 1 }}
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              className="glass-button p-2"
              title="Rehacer"
              disabled={historyIndex >= canvasHistory.length - 1}
              style={{ opacity: historyIndex >= canvasHistory.length - 1 ? 0.5 : 1 }}
            >
              <Redo className="w-5 h-5" />
            </button>
          </motion.div>

          {selectedObject && !isDrawingMode && (
            <motion.div
              className="glossy p-2 rounded-xl flex flex-col gap-2 shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ zIndex: 50 }}
            >
              <button
                onClick={deleteSelected}
                className="glass-button p-2 text-rose-500"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={duplicateSelected}
                className="glass-button p-2"
                title="Duplicar"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={toggleLock}
                className="glass-button p-2"
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
                className="glass-button p-2"
                title="Traer adelante"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustLayer('backward')}
                className="glass-button p-2"
                title="Enviar atrás"
              >
                <Minus className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustLayer('front')}
                className="glass-button p-2"
                title="Traer al frente"
              >
                <BringToFront className="w-5 h-5" />
              </button>
              <button
                onClick={() => adjustLayer('back')}
                className="glass-button p-2"
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
                className="absolute left-16 top-20 glossy p-5 rounded-xl shadow-lg"
                style={{ zIndex: 60, width: '280px' }}
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-gray-700">Ajustes de pincel</h3>
                  
                  {/* Brush preview */}
                  <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                    <div 
                      className="rounded-full border border-gray-300 shadow-sm"
                      style={{ 
                        width: `${Math.min(brushSize * 2, 100)}px`, 
                        height: `${Math.min(brushSize * 2, 100)}px`,
                        backgroundColor: brushColor,
                        transition: 'all 0.2s ease'
                      }}
                    ></div>
                  </div>
                  
                  {/* Brush size control */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-medium text-gray-600">Tamaño</label>
                      <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">{brushSize}px</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                        <div className="w-full h-2 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full"></div>
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
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Fino</span>
                      <span>Grueso</span>
                    </div>
                  </div>
                  
                  {/* Color presets */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">Colores</label>
                    <div className="grid grid-cols-6 gap-2">
                      {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
                        '#00ffff', '#ff00ff', '#ff9900', '#9900ff', '#4CAF50', '#2196F3'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBrushColor(color)}
                          className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${brushColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : 'ring-1 ring-gray-300'}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Custom color picker button */}
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center justify-center gap-2 text-sm py-2 px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: brushColor }}></div>
                    <span>Color personalizado</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                ref={colorPickerRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-16 top-0 glossy p-4 rounded-xl shadow-lg"
                style={{ zIndex: 70 }}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700">Selector de color</h3>
                    <button 
                      onClick={() => setShowColorPicker(false)}
                      className="text-gray-500 hover:text-gray-700 text-sm"
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
                      className="w-8 h-8 rounded-md border border-gray-300" 
                      style={{ backgroundColor: isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000') }}
                    ></div>
                    <input
                      type="text"
                      value={isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000')}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Toolbar - Mobile (horizontal) */}
      {isEditing && isOwner && isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 p-2 flex justify-center z-30 border-t border-gray-200 backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-button p-2 flex-shrink-0"
              title="Subir imagen"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              onClick={addText}
              className="glass-button p-2 flex-shrink-0"
              title="Añadir texto"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('rect')}
              className="glass-button p-2 flex-shrink-0"
              title="Añadir rectángulo"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={() => addShape('circle')}
              className="glass-button p-2 flex-shrink-0"
              title="Añadir círculo"
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={toggleDrawingMode}
              className={`glass-button p-2 flex-shrink-0 ${isDrawingMode ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}
              title={isDrawingMode ? "Desactivar modo dibujo" : "Activar modo dibujo"}
              data-brush-toggle="true"
            >
              {isDrawingMode ? <Slash className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="glass-button p-2 flex-shrink-0"
              title="Color"
              style={{ 
                backgroundColor: isDrawingMode ? brushColor : 'black',
                color: isDrawingMode && brushColor !== 'black' ? 'black' : 'black'
              }}
            >
              <Palette className="w-5 h-5" />
            </button>
            
            {/* Add undo/redo buttons */}
            <div className="h-full border-l border-gray-200 mx-1"></div>
            <button
              onClick={undo}
              className="glass-button p-2 flex-shrink-0"
              title="Deshacer"
              disabled={historyIndex <= 0}
              style={{ opacity: historyIndex <= 0 ? 0.5 : 1 }}
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              className="glass-button p-2 flex-shrink-0"
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
                  className="glass-button p-2 text-rose-500 flex-shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  onClick={duplicateSelected}
                  className="glass-button p-2 flex-shrink-0"
                  title="Duplicar"
                >
                  <Copy className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleLock}
                  className="glass-button p-2 flex-shrink-0"
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
          </div>
          
          {/* Mobile brush settings */}
          <AnimatePresence>
            {showBrushSettings && isDrawingMode && (
              <motion.div
                ref={brushSettingsRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-16 left-0 right-0 bg-white/95 p-4 border-t border-gray-200"
                style={{ zIndex: 60 }}
              >
                <div className="max-w-md mx-auto">
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="rounded-full border border-gray-300 shadow-sm flex-shrink-0"
                      style={{ 
                        width: `${Math.min(brushSize * 1.5, 40)}px`, 
                        height: `${Math.min(brushSize * 1.5, 40)}px`,
                        backgroundColor: brushColor,
                        transition: 'all 0.2s ease'
                      }}
                    ></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-medium text-gray-600">Tamaño</label>
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-md">{brushSize}px</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                          <div className="w-full h-2 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full"></div>
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
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Fino</span>
                        <span>Grueso</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                      {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
                        '#00ffff', '#ff00ff', '#ff9900', '#9900ff', '#4CAF50', '#2196F3'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBrushColor(color)}
                          className={`w-8 h-8 rounded-full transition-all ${brushColor === color ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'ring-1 ring-gray-300'}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Color ${color}`}
                        />
                      ))}
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-500"
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
          
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                ref={colorPickerRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute bottom-16 left-1/2 transform -translate-x-1/2 glossy p-4 rounded-xl shadow-lg"
                style={{ zIndex: 60 }}
              >
                <HexColorPicker
                  color={isDrawingMode ? brushColor : (selectedObject?.fill?.toString() || '#000000')}
                  onChange={handleColorChange}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
    
    const link = document.createElement('a');
    link.download = `canvas-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  saveCanvasState: async (canvas: fabric.Canvas | null, userId: string, setIsLoading: (isLoading: boolean) => void, onSave?: () => void) => {
    if (!canvas) return;

    setIsLoading(true);
    try {
      const canvasState = JSON.stringify(canvas.toJSON());
      const { error } = await supabase
        .from('profiles')
        .update({ canvas_state: canvasState })
        .eq('id', userId);

      if (error) throw error;
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving canvas state:', error);
    } finally {
      setIsLoading(false);
    }
  }
} 