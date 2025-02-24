import { create } from 'zustand';
import { fabric } from 'fabric';

interface ProfileState {
  canvas: fabric.Canvas | null;
  isEditing: boolean;
  setCanvas: (canvas: fabric.Canvas | null) => void;
  setIsEditing: (isEditing: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  canvas: null,
  isEditing: false,
  setCanvas: (canvas) => set({ canvas }),
  setIsEditing: (isEditing) => set({ isEditing }),
}));