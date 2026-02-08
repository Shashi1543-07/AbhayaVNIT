import { useEffect, useState, useRef } from 'react';
import { sosService, type SOSEvent } from '../../services/sosService';
import { useSirenStore } from '../../context/sirenStore';
import { useAuthStore } from '../../context/authStore';
import { VolumeX, Siren } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecuritySirenManager() {
    const { role } = useAuthStore();
    const { isUnlocked, setUnlocked } = useSirenStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeEvents, setActiveEvents] = useState<SOSEvent[]>([]);
    const sirenRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Only active for security
    const isSecurity = role === 'security';

    useEffect(() => {
        if (!isSecurity) return;

        // Initialize Siren Audio with custom local asset
        sirenRef.current = new Audio('/siren.mp3');
        sirenRef.current.loop = true;

        // Use standard window types
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
        }

        // Subscription to active SOS
        const unsubscribe = sosService.subscribeToActiveSOS((events) => {
            setActiveEvents(events);
        });

        // Browser Audio Unlock Logic
        const unlockAudio = () => {
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            setUnlocked(true);
            console.log('SecuritySirenManager: Audio Context Unlocked');
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        return () => {
            unsubscribe();
            if (sirenRef.current) {
                sirenRef.current.pause();
                sirenRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
    }, [isSecurity, setUnlocked]);

    // Siren Logic: Play if any SOS is unrecognised and audio is unlocked
    useEffect(() => {
        if (!isSecurity) return;

        const hasUnrecognisedSOS = activeEvents.some(event => !event.status.recognised);

        if (hasUnrecognisedSOS && isUnlocked) {
            sirenRef.current?.play().then(() => {
                setIsPlaying(true);
            }).catch(err => {
                console.warn("Global Siren System: Playback blocked", err);
            });
        } else {
            sirenRef.current?.pause();
            setIsPlaying(false);
        }
    }, [activeEvents, isUnlocked, isSecurity]);

    if (!isSecurity) return null;

    return (
        <AnimatePresence>
            {/* Standby Status Banner (Visible only when NOT unlocked) */}
            {!isUnlocked && !isPlaying && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed bottom-24 left-4 right-4 z-[90]"
                >
                    <div className="glass-card-soft bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/20 animate-pulse">
                                <VolumeX className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Alert System Standby</h4>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase">Click anywhere to arm sirens</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest">
                            System Disarmed
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Visual Red Alert Indicator (Subtle pulsating orb when playing) */}
            {isPlaying && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed top-24 right-4 z-[90] pointer-events-none"
                >
                    <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/50 flex items-center justify-center animate-ping absolute inset-0" />
                    <div className="w-12 h-12 rounded-full bg-red-600 border border-red-500 flex items-center justify-center relative shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                        <Siren className="w-6 h-6 text-white animate-bounce" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
