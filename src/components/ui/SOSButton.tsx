import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, AlertTriangle, HeartPulse } from 'lucide-react';
import { sosPulse, sosRipple } from '../../lib/animations';

interface SOSButtonProps {
    onActivate: (type: 'medical' | 'harassment' | 'general') => void;
    className?: string;
    disabled?: boolean;
}

const SOSButton: React.FC<SOSButtonProps> = ({ onActivate, className = '', disabled = false }) => {
    const [isPressing, setIsPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [sosType, setSosType] = useState<'medical' | 'harassment' | 'general'>('general');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isPressing && !disabled) {
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        onActivate(sosType);
                        return 0;
                    }
                    return prev + 2.5; // 40ms * 2.5 = 100% in ~1.6s (faster for better UX)
                });
            }, 40);
        } else {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [isPressing, onActivate, sosType, disabled]);

    const handleStart = () => setIsPressing(true);
    const handleEnd = () => {
        setIsPressing(false);
        setSosType('general');
    };

    const handleMove = (info: any) => {
        const y = info.offset.y;

        if (y < -50) setSosType('medical');
        else if (y > 50) setSosType('harassment');
        else setSosType('general');
    };

    return (
        <div className={`relative flex flex-col items-center justify-center h-64 ${className}`} ref={containerRef}>

            {/* Top Label - Medical */}
            <AnimatePresence>
                {isPressing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: sosType === 'medical' ? 1 : 0.4, y: sosType === 'medical' ? -20 : 0, scale: sosType === 'medical' ? 1.1 : 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -top-12 flex flex-col items-center text-emergency font-bold"
                    >
                        <HeartPulse className="w-8 h-8 mb-1" />
                        <span>MEDICAL</span>
                        <ChevronUp className="w-4 h-4 animate-bounce" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ripple Effect Background - Only on Long Press */}
            <AnimatePresence>
                {isPressing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <motion.div
                            variants={sosRipple}
                            initial="initial"
                            animate="animate"
                            className="w-32 h-32 rounded-full bg-emergency-pulse"
                        />
                    </div>
                )}
            </AnimatePresence>

            {/* Main Button */}
            <motion.div
                variants={!isPressing ? sosPulse : undefined}
                animate={!isPressing ? "animate" : undefined}
                drag="y"
                dragConstraints={{ top: -100, bottom: 100 }}
                dragElastic={0.2}
                onDragStart={handleStart}
                onDragEnd={handleEnd}
                onDrag={(_, info) => handleMove(info)}
                onMouseDown={handleStart}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchEnd={handleEnd}
                whileTap={{ scale: 0.94 }}
                className={`relative z-10 w-32 h-32 rounded-full shadow-glow flex flex-col items-center justify-center text-white overflow-hidden cursor-grab active:cursor-grabbing ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                style={{
                    background: sosType === 'medical' ? 'linear-gradient(135deg, #4CAF50, #388E3C)' :
                        sosType === 'harassment' ? 'linear-gradient(135deg, #FFC947, #FFB300)' :
                            'linear-gradient(135deg, #FF4F5A, #D32F2F)'
                }}
            >
                {/* Progress Fill */}
                <div
                    className="absolute bottom-0 left-0 right-0 bg-black/30 transition-all duration-75 ease-linear"
                    style={{ height: `${progress}%` }}
                />

                <span className="text-3xl font-bold font-heading relative z-20 drop-shadow-md">
                    {sosType === 'medical' ? 'MED' : sosType === 'harassment' ? 'HELP' : 'SOS'}
                </span>
                <span className="text-[10px] font-medium opacity-90 mt-1 relative z-20 uppercase tracking-wider">
                    {sosType === 'general' ? 'Hold 3s' : 'Release'}
                </span>
            </motion.div>

            {/* Bottom Label - Harassment */}
            <AnimatePresence>
                {isPressing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: sosType === 'harassment' ? 1 : 0.4, y: sosType === 'harassment' ? 20 : 0, scale: sosType === 'harassment' ? 1.1 : 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-12 flex flex-col items-center text-warning font-bold"
                    >
                        <ChevronDown className="w-4 h-4 animate-bounce" />
                        <span>HARASSMENT</span>
                        <AlertTriangle className="w-8 h-8 mt-1" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SOSButton;
