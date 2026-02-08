import { create } from 'zustand';

interface SirenState {
    isUnlocked: boolean;
    setUnlocked: (unlocked: boolean) => void;
}

export const useSirenStore = create<SirenState>((set) => ({
    isUnlocked: false,
    setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
}));
