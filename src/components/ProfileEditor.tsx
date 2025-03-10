import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useProfileStore } from '../lib/store';
import {
  Save, Edit3, Eye, Download, Undo, Redo
} from 'lucide-react';
import { ProfileCanvas, canvasUtils } from './ProfileCanvas';

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

  // Handle save completion
  const handleSaveComplete = () => {
    setIsEditing(false);
  };

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
    <div className="w-full mx-auto p-4 ">
      <div className="relative">
        {/* Editor Controls */}
        {isOwner && (
          <div className="mb-4 flex flex-wrap items-center justify-between z-40 relative">
            <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-0">
              <motion.button
                onClick={() => setIsEditing(!isEditing)}
                className="glass-button px-4 py-2 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
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
                    onClick={() => canvasUtils.saveCanvasState(canvas, userId, setIsLoading, handleSaveComplete)}
                    className="glass-button px-4 py-2 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isLoading ? 'Guardando...' : 'Guardar'}</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => canvasUtils.exportCanvas(canvas)}
                    className="glass-button px-4 py-2 flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
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
                  className="glass-button p-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={historyIndex <= 0}
                  title="Deshacer"
                >
                  <Undo className="w-4 h-4" />
                </motion.button>
                <motion.button
                  onClick={handleRedo}
                  className="glass-button p-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={historyIndex >= canvasHistory.length - 1}
                  title="Rehacer"
                >
                  <Redo className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* Main content container with proper positioning */}
        <div className="relative flex">
          {/* Left sidebar space for desktop */}
          {isEditing && !isMobile && (
            <div className="w-16 flex-shrink-0"></div>
          )}
          
          {/* Canvas component */}
          <ProfileCanvas 
            userId={userId}
            isOwner={isOwner}
            isEditing={isEditing}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onSave={handleSaveComplete}
            canvasHistory={canvasHistory}
            setCanvasHistory={setCanvasHistory}
            historyIndex={historyIndex}
            setHistoryIndex={setHistoryIndex}
          />
        </div>
      </div>
    </div>
  );
}