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
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
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

    // Handle audio output for speaker mode
    useEffect(() => {
        const audioEl = isVideoCall ? remoteVideoRef.current : audioRef.current;
        if (audioEl && (audioEl as any).setSinkId) {
            // This is a experimental API, but try fetching devices if needed
            // For now we just log, as actual switching often needs device enumeration
        }
    }, [isSpeakerOn]);

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

    const toggleSpeaker = () => {
        const next = !isSpeakerOn;
        callService.setSpeakerMode(next);
        setIsSpeakerOn(next);
    };

    const switchCamera = () => {
        callService.switchCamera();
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-[#050505] flex flex-col items-center justify-between font-outfit text-white overflow-hidden shadow-2xl">
            {/* Immersive Background for Audio Calls */}
            {!isVideoCall && (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#D4AF37]/5 to-transparent" />
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.25, 0.1]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#D4AF37]/10 rounded-full blur-[120px]"
                    />
                </div>
            )}

            {/* Video Streams Layer */}
            {isVideoCall ? (
                <div className="absolute inset-0 z-0 bg-black">
                    {/* Remote Video (Full Screen with subtle rounding) */}
                    <div className="w-full h-full relative overflow-hidden">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
                    </div>

                    {/* Remote Video Placeholder */}
                    <AnimatePresence>
                        {(!remoteStream || remoteStream.getVideoTracks().length === 0 || !remoteStream.getVideoTracks()[0].enabled) && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl"
                            >
                                <div className="w-32 h-32 bg-white/5 rounded-[40px] flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
                                    <User className="w-16 h-16 text-[#D4AF37]/50" />
                                </div>
                                <div className="text-center">
                                    <p className="text-white/90 text-lg font-black uppercase tracking-widest">{partnerName}</p>
                                    <p className="text-[#D4AF37]/60 text-[10px] font-black uppercase tracking-widest mt-1">Video Paused</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Local Video (Floating / Draggable Style) */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        initial={{ x: 0, y: 0 }}
                        className="absolute bottom-40 right-6 w-36 h-48 bg-black/40 backdrop-blur-3xl rounded-[32px] overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 cursor-grab active:cursor-grabbing group"
                    >
                        {isVideoOff ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50">
                                <VideoOff className="w-6 h-6 text-[#D4AF37]/40" />
                                <span className="text-[8px] font-black text-[#D4AF37]/30 uppercase tracking-widest mt-2">Off</span>
                            </div>
                        ) : (
                            <div className="w-full h-full relative">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover mirror"
                                />
                                <div className="absolute inset-0 border-[0.5px] border-white/10 rounded-[32px] pointer-events-none" />
                            </div>
                        )}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                </div>
            ) : (
                <audio ref={audioRef} autoPlay playsInline className="hidden" />
            )}

            {/* Top Bar (Call Info & SOS Ribbon) */}
            <div className="relative z-10 w-full px-6 pt-16 flex flex-col items-center">
                <AnimatePresence>
                    {isEmergency && (
                        <motion.div
                            initial={{ y: -30, opacity: 0, scale: 0.9 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            className={`mb-8 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 backdrop-blur-3xl border shadow-2xl ${contextType === 'sos'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full animate-pulse ${contextType === 'sos' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-[#D4AF37] shadow-[0_0_100px_rgba(212,175,55,0.6)]'
                                }`} />
                            {contextType === 'sos' ? 'Emergency SOS' : 'Safe Walk'} ACTIVE
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isVideoCall && (
                    <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-[48px] flex items-center justify-center mb-8 border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
                        <User className="w-16 h-16 text-[#D4AF37]" />
                    </div>
                )}

                <div className="text-center">
                    <h2 className={`font-black uppercase tracking-tighter ${isVideoCall ? 'text-2xl drop-shadow-xl' : 'text-4xl mb-2'}`}>
                        {partnerName}
                    </h2>
                    <p className={`font-black uppercase tracking-[0.3em] opacity-60 ${isVideoCall ? 'text-[10px]' : 'text-[#D4AF37] text-xs'}`}>
                        {partnerRole}
                    </p>
                </div>

                <div className={`mt-6 px-5 py-1.5 rounded-2xl border text-[11px] font-black tracking-[0.3em] 
                    ${isVideoCall ? 'bg-black/40 backdrop-blur-2xl border-white/10' : 'bg-white/5 backdrop-blur-3xl border-white/10'}`}>
                    {formatTime(duration)}
                </div>
            </div>

            {/* Visualizer for Audio Calls */}
            {!isVideoCall && (
                <div className="relative z-10 flex items-end gap-1.5 h-16">
                    {[...Array(16)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ height: [12, Math.random() * 48 + 12, 12] }}
                            transition={{ duration: 0.6 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                            className="w-1.5 bg-gradient-to-t from-[#D4AF37]/40 to-[#D4AF37] rounded-full"
                        />
                    ))}
                </div>
            )}

            {/* THE GLASS DOCK - Classic & Functional Control System */}
            <div className="relative z-20 w-full px-6 pb-12 flex flex-col items-center">
                <div className="w-full max-w-[400px] bg-black/40 backdrop-blur-3xl rounded-[40px] p-4 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2">
                    {/* Audio Toggle */}
                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-[24px] flex items-center justify-center border transition-all active:scale-90 ${isMuted
                            ? 'bg-white text-black border-white shadow-xl'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Speaker Toggle */}
                    <button
                        onClick={toggleSpeaker}
                        className={`w-14 h-14 rounded-[24px] flex items-center justify-center border transition-all active:scale-90 ${isSpeakerOn
                            ? 'bg-white text-black border-white shadow-xl'
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                            }`}
                    >
                        <Volume2 className="w-6 h-6" />
                    </button>

                    {/* END CALL - The Central Action */}
                    <button
                        onClick={onEnd}
                        className="w-20 h-20 bg-red-600 hover:bg-red-700 text-white rounded-[28px] flex items-center justify-center shadow-[0_15px_40px_rgba(220,38,38,0.5)] transition-all active:scale-95 group relative"
                    >
                        <PhoneOff className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                        <div className="absolute inset-0 rounded-[28px] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    {/* Video Toggle */}
                    {isVideoCall ? (
                        <button
                            onClick={toggleVideo}
                            className={`w-14 h-14 rounded-[24px] flex items-center justify-center border transition-all active:scale-90 ${isVideoOff
                                ? 'bg-white text-black border-white shadow-xl'
                                : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                    ) : (
                        <div className="w-14 h-14" /> // Spacer for alignment
                    )}

                    {/* Camera Switch Toggle */}
                    {isVideoCall ? (
                        <button
                            onClick={switchCamera}
                            className="w-14 h-14 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-90"
                        >
                            <Camera className="w-6 h-6" />
                        </button>
                    ) : (
                        <div className="w-14 h-14" /> // Spacer for alignment
                    )}
                </div>
            </div>

            <style>{`
                .mirror { transform: scaleX(-1); }
                .font-outfit { font-family: 'Outfit', sans-serif; }
                @keyframes breathingGradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
}

