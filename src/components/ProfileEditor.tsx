import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fabric } from 'fabric';
import { HexColorPicker } from 'react-colorful';
import { useProfileStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  Image, Type, Square, Circle, Palette, Save,
  Edit3, Eye, Upload, Trash2, Plus, Minus,
  RotateCcw, Lock, Unlock, Layers
} from 'lucide-react';

interface ProfileEditorProps {
  userId: string;
  isOwner: boolean;
}

export function ProfileEditor({ userId, isOwner }: ProfileEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { canvas, setCanvas, isEditing, setIsEditing } = useProfileStore();
  
  useEffect(() => {
    if (!canvasRef.current || canvas) return;

    const newCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth > 768 ? 800 : window.innerWidth - 32,
      height: 600,
      backgroundColor: '#ffffff'
    });

    setCanvas(newCanvas);

    // Load saved canvas state
    loadCanvasState();

    return () => {
      newCanvas.dispose();
      setCanvas(null);
    };
  }, []);

  useEffect(() => {
    if (!canvas) return;

    canvas.on('selection:created', (e) => {
      setSelectedObject(canvas.getActiveObject());
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    return () => {
      canvas.off('selection:created');
      canvas.off('selection:cleared');
    };
  }, [canvas]);

  const loadCanvasState = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('canvas_state')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data?.canvas_state && canvas) {
        canvas.loadFromJSON(data.canvas_state, () => {
          canvas.renderAll();
        });
      }
    } catch (error) {
      console.error('Error loading canvas state:', error);
    }
  };

  const saveCanvasState = async () => {
    if (!canvas) return;

    try {
      const canvasState = JSON.stringify(canvas.toJSON());
      const { error } = await supabase
        .from('profiles')
        .update({ canvas_state: canvasState })
        .eq('id', userId);

      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving canvas state:', error);
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
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.[0]) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      fabric.Image.fromURL(event.target.result.toString(), (img) => {
        img.scaleToWidth(200);
        canvas.add(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleColorChange = (color: string) => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('fill', color);
    canvas.renderAll();
  };

  const deleteSelected = () => {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    setSelectedObject(null);
    canvas.renderAll();
  };

  const toggleLock = () => {
    if (!selectedObject) return;
    selectedObject.set('lockMovementX', !selectedObject.lockMovementX);
    selectedObject.set('lockMovementY', !selectedObject.lockMovementY);
    canvas?.renderAll();
  };

  const adjustLayer = (direction: 'forward' | 'backward') => {
    if (!selectedObject || !canvas) return;
    if (direction === 'forward') {
      selectedObject.bringForward();
    } else {
      selectedObject.sendBackwards();
    }
    canvas.renderAll();
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="relative">
        {/* Editor Controls */}
        {isOwner && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setIsEditing(!isEditing)}
                className="glass-button px-4 py-2 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isEditing ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Vista previa</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Editar</span>
                  </>
                )}
              </motion.button>
              
              {isEditing && (
                <motion.button
                  onClick={saveCanvasState}
                  className="glass-button px-4 py-2 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </motion.button>
              )}
            </div>
          </div>
        )}

        {/* Toolbar */}
        {isEditing && isOwner && (
          <div className="absolute left-4 top-20 flex flex-col gap-2">
            <motion.div
              className="glossy p-2 rounded-xl flex flex-col gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
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
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="glass-button p-2"
                title="Color"
              >
                <Palette className="w-5 h-5" />
              </button>
            </motion.div>

            {selectedObject && (
              <motion.div
                className="glossy p-2 rounded-xl flex flex-col gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <button
                  onClick={deleteSelected}
                  className="glass-button p-2 text-rose-500"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
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
              </motion.div>
            )}

            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-16 top-0 glossy p-4 rounded-xl"
                >
                  <HexColorPicker
                    color={selectedObject?.fill?.toString() || '#000000'}
                    onChange={handleColorChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Canvas */}
        <div className={`relative rounded-2xl overflow-hidden ${isEditing ? 'border-2 border-dashed border-violet-300' : ''}`}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}