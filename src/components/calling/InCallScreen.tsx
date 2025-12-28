import { useState, useEffect, useRef } from 'react';
import { callService } from '../../services/callService';

import { Mic, MicOff, PhoneOff, User, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface InCallScreenProps {
    partnerName: string;
    partnerRole: string;
    remoteStream: MediaStream | null;
    onEnd: () => void;
}

export default function InCallScreen({ partnerName, partnerRole, remoteStream, onEnd }: InCallScreenProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (audioRef.current && remoteStream) {
            audioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        callService.toggleMute(newMuted);
        setIsMuted(newMuted);
    };


    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900 flex flex-col items-center justify-between py-20 px-6 text-white overflow-hidden">
            {/* Background Aesthetic */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary-500/30 to-transparent" />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/20 rounded-full blur-[100px]"
                />
            </div>

            <audio ref={audioRef} autoPlay playsInline className="hidden" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20 shadow-2xl">
                    <User className="w-16 h-16 text-primary-200" />
                </div>
                <h2 className="text-3xl font-black mb-1">{partnerName}</h2>
                <p className="text-primary-300 font-medium opacity-80 mb-4">{partnerRole}</p>
                <div className="bg-white/5 backdrop-blur-md px-4 py-1 rounded-full border border-white/10 text-sm font-mono tracking-widest">
                    {formatTime(duration)}
                </div>
            </div>

            {/* Visualizer Mockout */}
            <div className="relative z-10 flex items-end gap-1 h-12">
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ height: [10, Math.random() * 40 + 10, 10] }}
                        transition={{ duration: 0.5 + Math.random(), repeat: Infinity }}
                        className="w-1 bg-primary-400/60 rounded-full"
                    />
                ))}
            </div>

            <div className="relative z-10 flex gap-8">
                <button
                    onClick={toggleMute}
                    className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isMuted
                        ? 'bg-white text-slate-900 border-white'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                >
                    {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </button>

                <button
                    onClick={onEnd}
                    className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 transition-all active:scale-90"
                >
                    <PhoneOff className="w-7 h-7" />
                </button>

                <button
                    className="w-16 h-16 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90"
                >
                    <Volume2 className="w-7 h-7" />
                </button>
            </div>
        </div>
    );
}
