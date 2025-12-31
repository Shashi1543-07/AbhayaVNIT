import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface SafeWalkTimerProps {
    expectedTime: Date;
    onComplete: () => void;
    onExtend: (minutes: number) => void;
}

export default function SafeWalkTimer({ expectedTime, onComplete, onExtend }: SafeWalkTimerProps) {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = expectedTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft('00:00');
                setIsUrgent(true);
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                if (diff < 300000) setIsUrgent(true);
                else setIsUrgent(false);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expectedTime]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`glass-card p-8 rounded-[2.5rem] text-center border-2 transition-all duration-500 shadow-2xl ${isUrgent ? 'border-red-400 bg-red-500/5' : 'border-primary/30 bg-primary/5'
                }`}
        >
            <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`p-2 rounded-xl ${isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-primary/10 text-primary'}`}>
                    <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Safe Walk</h3>
            </div>

            <div className={`text-7xl font-black mb-6 tracking-tighter tabular-nums ${isUrgent ? 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                }`}>
                {timeLeft}
            </div>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8 px-4 opacity-80 leading-relaxed">
                Expected arrival at destination. Tracking is live.
            </p>

            <div className="grid grid-cols-1 gap-4">
                <button
                    onClick={onComplete}
                    className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <CheckCircle className="w-5 h-5" />
                    DEPARTURE COMPLETE
                </button>

                <button
                    onClick={() => onExtend(5)}
                    className="w-full py-4 bg-white/40 backdrop-blur-md text-primary border border-primary/20 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/60 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Extend 5 Mins
                </button>
            </div>
        </motion.div>
    );
}
