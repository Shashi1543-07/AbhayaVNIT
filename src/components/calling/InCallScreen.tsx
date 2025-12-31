import { useState, useEffect, useRef } from 'react';
import { callService } from '../../services/callService';
import { Mic, MicOff, PhoneOff, User, Volume2, Video, VideoOff, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InCallScreenProps {
    callId: string;
    partnerName: string;
    partnerRole: string;
    remoteStream: MediaStream | null;
    localStream: MediaStream | null;
    callType: 'audio' | 'video';
    contextType?: 'sos' | 'safe_walk';
    onEnd: () => void;
}

export default function InCallScreen({
    partnerName,
    partnerRole,
    remoteStream,
    localStream,
    callType,
    contextType,
    onEnd
}: InCallScreenProps) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [duration, setDuration] = useState(0);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const isVideoCall = callType === 'video';
    const isEmergency = !!contextType;

    useEffect(() => {
        const timer = setInterval(() => setDuration(d => d + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (isVideoCall) {
            if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            if (localVideoRef.current && localStream) {
                localVideoRef.current.srcObject = localStream;
            }
        } else {
            if (audioRef.current && remoteStream) {
                audioRef.current.srcObject = remoteStream;
            }
        }
    }, [remoteStream, localStream, isVideoCall]);

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

    const toggleVideo = () => {
        const newVideoState = !isVideoOff;
        callService.toggleVideo(!newVideoState);
        setIsVideoOff(newVideoState);
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-between font-outfit text-white overflow-hidden">
            {/* Background Aesthetic for Audio Calls */}
            {!isVideoCall && (
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
            )}

            {/* Video Streams */}
            {isVideoCall ? (
                <div className="absolute inset-0 z-0 bg-black">
                    {/* Remote Video (Full Screen) */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />

                    {/* Remote Video Overlay (for when partner hides video) */}
                    <AnimatePresence>
                        {(!remoteStream || remoteStream.getVideoTracks().length === 0 || !remoteStream.getVideoTracks()[0].enabled) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl"
                            >
                                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20">
                                    <User className="w-12 h-12 text-white/50" />
                                </div>
                                <p className="text-white/60 font-medium">{partnerName} has paused video</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Local Video (Floating / Draggable Style) */}
                    <motion.div
                        drag
                        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
                        className="absolute top-24 right-5 w-32 h-44 bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-50 cursor-move"
                    >
                        {isVideoOff ? (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                <VideoOff className="w-6 h-6 text-white/30" />
                            </div>
                        ) : (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover mirror"
                            />
                        )}
                    </motion.div>
                </div>
            ) : (
                <audio ref={audioRef} autoPlay playsInline className="hidden" />
            )}

            {/* Top Bar (Call Info) */}
            <div className="relative z-10 w-full px-6 pt-12 flex flex-col items-center">
                {isEmergency && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`mb-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border ${contextType === 'sos'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                            }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${contextType === 'sos' ? 'bg-red-400' : 'bg-primary-400'
                            }`} />
                        {contextType === 'sos' ? 'Emergency SOS' : 'Safe Walk'} Call
                    </motion.div>
                )}
                {!isVideoCall && (
                    <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-6 border border-white/20 shadow-2xl">
                        <User className="w-14 h-14 text-primary-200" />
                    </div>
                )}
                <h2 className={`font-black text-center ${isVideoCall ? 'text-xl drop-shadow-lg' : 'text-3xl mb-1'}`}>
                    {partnerName}
                </h2>
                <p className={`font-medium opacity-80 ${isVideoCall ? 'text-xs drop-shadow-md' : 'text-primary-300 mb-4'}`}>
                    {partnerRole}
                </p>
                <div className={`px-4 py-1 rounded-full border text-xs font-mono tracking-widest mt-2 
                    ${isVideoCall ? 'bg-black/30 backdrop-blur-md border-white/10' : 'bg-white/5 backdrop-blur-md border-white/10'}`}>
                    {formatTime(duration)}
                </div>
            </div>

            {/* Visualizer for Audio Calls */}
            {!isVideoCall && (
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
            )}

            {/* Controls */}
            <div className="relative z-10 w-full px-8 pb-16 flex flex-col items-center gap-8">
                <div className="flex gap-6 items-center">
                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isMuted
                            ? 'bg-white text-slate-900 border-white shadow-lg'
                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md'
                            }`}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {isVideoCall && (
                        <button
                            onClick={toggleVideo}
                            className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all active:scale-90 ${isVideoOff
                                ? 'bg-white text-slate-900 border-white shadow-lg'
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md'
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                    )}

                    <button
                        onClick={onEnd}
                        className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 transition-all active:scale-95"
                    >
                        <PhoneOff className="w-8 h-8" />
                    </button>

                    <button
                        className="w-14 h-14 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-90"
                    >
                        <Volume2 className="w-6 h-6" />
                    </button>

                    {isVideoCall && (
                        <button
                            className="w-14 h-14 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 backdrop-blur-md transition-all active:scale-90"
                        >
                            <Camera className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .mirror {
                    transform: scaleX(-1);
                }
                .font-outfit {
                    font-family: 'Outfit', sans-serif;
                }
            `}</style>
        </div>
    );
}

