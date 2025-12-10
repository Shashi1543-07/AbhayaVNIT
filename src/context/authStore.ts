import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
    user: User | null;
    role: string | null;
    profile: any | null;
    forcePasswordReset: boolean;
    loading: boolean;
    setUser: (user: User | null) => void;
    setRole: (role: string | null) => void;
    setProfile: (profile: any | null) => void;
    setForcePasswordReset: (force: boolean) => void;
    setLoading: (loading: boolean) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    role: null,
    profile: null,
    forcePasswordReset: false,
    loading: true,
    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    setProfile: (profile) => set({ profile }),
    setForcePasswordReset: (force) => set({ forcePasswordReset: force }),
    setLoading: (loading) => set({ loading }),
    logout: async () => {
        try {
            await signOut(auth);
            set({ user: null, role: null });
        } catch (error) {
            console.error("Logout error:", error);
        }
    }
}));
