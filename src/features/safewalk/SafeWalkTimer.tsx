import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

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
                // In a real app, this would trigger auto-escalation if not stopped
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

                if (diff < 300000) { // Less than 5 mins
                    setIsUrgent(true);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expectedTime]);

    return (
        <div className={`p-6 rounded-xl text-center ${isUrgent ? 'bg-red-50 border-2 border-red-500' : 'bg-indigo-50 border-2 border-indigo-500'}`}>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Safe Walk Active</h3>
            <div className={`text-5xl font-bold mb-4 ${isUrgent ? 'text-red-600' : 'text-indigo-600'}`}>
                {timeLeft}
            </div>
            <p className="text-sm text-slate-600 mb-6">
                Expected arrival at destination.
            </p>

            <div className="space-y-3">
                <button
                    onClick={onComplete}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                    <CheckCircle className="w-5 h-5" />
                    I Reached Safely
                </button>

                <button
                    onClick={() => onExtend(5)}
                    className="w-full py-3 bg-white text-indigo-600 border border-indigo-200 rounded-lg font-medium hover:bg-indigo-50 transition"
                >
                    Extend by 5 mins
                </button>
            </div>
        </div>
    );
}
