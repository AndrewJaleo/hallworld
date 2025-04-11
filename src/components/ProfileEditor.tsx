import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useProfileStore } from '../lib/store';
import {
  Save, Edit3, Eye, Download, Undo, Redo
} from 'lucide-react';
import { ProfileCanvas, canvasUtils } from './ProfileCanvas';
import { supabase } from '../lib/supabase';

interface ProfileEditorProps {
  userId: string;
  isOwner: boolean;
}

export function ProfileEditor({ userId, isOwner }: ProfileEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { canvas, isEditing, setIsEditing } = useProfileStore();
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSaving, setIsSaving] = useState(false);

  // Track window size for responsive layout
  useEffect(() => {
    const handleWindowResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Ensure editing mode is set to true when component mounts if user is owner
  useEffect(() => {
    if (isOwner && !isEditing) {
      setIsEditing(true);
    }
  }, [isOwner]);

  // Handle save operation with a separate effect to avoid React reconciliation issues
  useEffect(() => {
    const saveCanvas = async () => {
      if (!isSaving || !canvas || !userId) return;

      try {
        setIsLoading(true);

        // Simple serialization
        const canvasJSON = canvas.toJSON();
        const canvasState = JSON.stringify(canvasJSON);

        console.log('Saving canvas state...');

        // Direct Supabase call
        const { error } = await supabase
          .from('profiles')
          .update({ canvas_state: canvasState })
          .eq('id', userId);

        if (error) {
          console.error('Error saving to Supabase:', error);
          return;
        }

        console.log('Canvas saved successfully');

        // Use setTimeout to defer state updates
        setTimeout(() => {
          setIsEditing(false);
          setIsSaving(false);
          setIsLoading(false);
        }, 100);
      } catch (error) {
        console.error('Error saving canvas:', error);
        setIsSaving(false);
        setIsLoading(false);
      }
    };

    saveCanvas();
  }, [isSaving, canvas, userId]);

  // Safe save function that triggers the save effect
  const handleSave = useCallback(() => {
    if (isLoading || isSaving) return;
    setIsSaving(true);
  }, [isLoading, isSaving]);

  // Safe export function
  const handleExport = useCallback(() => {
    if (!canvas) return;

    try {
      // Create data URL
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1
      });

      // Create a blob instead of using a link element
      const byteString = atob(dataURL.split(',')[1]);
      const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);

      // Use a safer download approach
      const filename = `canvas-${new Date().toISOString().slice(0, 10)}.png`;

      // Create a temporary link without appending to DOM
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;

      // Use a safer click approach
      document.body.appendChild(a);
      a.click();

      // Clean up safely with timeout
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error exporting canvas:', error);
    }
  }, [canvas]);

  // Undo function
  const handleUndo = () => {
    console.log(`Editor Undo called. Current index: ${historyIndex}, History length: ${canvasHistory.length}`);

    if (!canvas || historyIndex <= 0) {
      console.log('Editor cannot undo: at beginning of history or no canvas');
      return;
    }

    const newIndex = historyIndex - 1;
    console.log(`Editor undoing to index ${newIndex}`);

    try {
      canvas.loadFromJSON(canvasHistory[newIndex], () => {
        canvas.renderAll();
        setHistoryIndex(newIndex);
        console.log(`Editor undo successful. New index: ${newIndex}`);
      });
    } catch (error) {
      console.error('Error during editor undo:', error);
    }
  };

  // Redo function
  const handleRedo = () => {
    console.log(`Editor Redo called. Current index: ${historyIndex}, History length: ${canvasHistory.length}`);

    if (!canvas || historyIndex >= canvasHistory.length - 1) {
      console.log('Editor cannot redo: at end of history or no canvas');
      return;
    }

    const newIndex = historyIndex + 1;
    console.log(`Editor redoing to index ${newIndex}`);

    try {
      canvas.loadFromJSON(canvasHistory[newIndex], () => {
        canvas.renderAll();
        setHistoryIndex(newIndex);
        console.log(`Editor redo successful. New index: ${newIndex}`);
      });
    } catch (error) {
      console.error('Error during editor redo:', error);
    }
  };

  // Add a useEffect to log history changes for debugging
  useEffect(() => {
    console.log(`History updated in Editor. Index: ${historyIndex}, Length: ${canvasHistory.length}`);
  }, [historyIndex, canvasHistory]);

  return (
    <div className="w-full mx-auto p-2 sm:p-4 overflow-hidden">
      <div className="relative">
        {/* Editor Controls */}
        {isOwner && (
          <div className="mb-4 flex flex-wrap items-center justify-between z-40 relative">
            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-0">
              <motion.button
                onClick={() => setIsEditing(!isEditing)}
                className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 px-4 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-2 text-cyan-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading || isSaving}
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
                <>
                  <motion.button
                    onClick={handleSave}
                    className="relative overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 p-2 px-4 border border-cyan-500/20 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-2 text-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading || isSaving}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isLoading || isSaving ? 'Guardando...' : 'Guardar'}</span>
                  </motion.button>

                  <motion.button
                    onClick={handleExport}
                    className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 px-4 shadow-[0_2px_5px_rgba(31,38,135,0.1)] flex items-center gap-2 text-cyan-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading || isSaving}
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                  </motion.button>
                </>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleUndo}
                  className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={historyIndex <= 0 || isLoading || isSaving}
                  title="Deshacer"
                >
                  <Undo className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={handleRedo}
                  className="relative overflow-hidden rounded-full bg-cyan-800/30 backdrop-blur-md border border-cyan-500/20 p-2 shadow-[0_2px_5px_rgba(31,38,135,0.1)] text-cyan-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={historyIndex >= canvasHistory.length - 1 || isLoading || isSaving}
                  title="Rehacer"
                >
                  <Redo className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* Main content container with proper positioning */}
        <div className="relative flex flex-col items-center">
          {/* Left sidebar space for desktop */}
          {isEditing && !isMobile && (
            <div className="absolute left-0 top-0 bottom-0 w-16 flex-shrink-0"></div>
          )}

          {/* Canvas component */}
          <div className="w-full">
            <ProfileCanvas
              userId={userId}
              isOwner={isOwner}
              isEditing={isEditing}
              isLoading={isLoading || isSaving}
              setIsLoading={setIsLoading}
              canvasHistory={canvasHistory}
              setCanvasHistory={setCanvasHistory}
              historyIndex={historyIndex}
              setHistoryIndex={setHistoryIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
}