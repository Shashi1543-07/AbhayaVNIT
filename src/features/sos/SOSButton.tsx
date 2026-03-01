import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useSOS } from './useSOS';
import { AlertTriangle, Mic, MicOff, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import SOSPostTriggerModal from './SOSPostTriggerModal';

import { useLiveLocationTracking } from '../../hooks/useLiveLocationTracking';
import { useAuthStore } from '../../context/authStore';

export default function SOSButton() {
    const { triggerSOS, loading, activeSOS } = useSOS();
    const { user } = useAuthStore();

    // Start tracking if SOS is active and we have a user ID
    useLiveLocationTracking(!!activeSOS, user?.uid);

    const [isPressed, setIsPressed] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [dismissedEventId, setDismissedEventId] = useState<string | null>(null);
    const progressTween = useRef<gsap.core.Tween | null>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Import GSAP if not present, but wait, I should check if it's imported.
    // I will add the import at the top too.

    const handleMouseDown = () => {
        if (activeSOS) return; // Already active
        setIsPressed(true);

        // Kill any existing tween
        if (progressTween.current) progressTween.current.kill();

        // High performance GSAP animation
        progressTween.current = gsap.to({}, {
            duration: 1.5,
            ease: "none",
            onUpdate: function () {
                const p = this.progress() * 100;
                if (progressBarRef.current) {
                    progressBarRef.current.style.width = `${p}%`;
                }
            },
            onComplete: () => {
                triggerSOS();
                resetPress();
            }
        });
    };

    const handleMouseUp = () => {
        resetPress();
    };

    const resetPress = () => {
        setIsPressed(false);
        if (progressTween.current) {
            progressTween.current.kill();
            progressTween.current = null;
        }
        if (progressBarRef.current) {
            progressBarRef.current.style.width = '0%';
        }
    };

    const handleModalClose = () => {
        if (activeSOS) {
            setDismissedEventId(activeSOS.id);
        }
    };

    if (activeSOS) {
        return (
            <>
                <div className="w-full p-6 bg-red-100 border-2 border-red-500 rounded-xl flex flex-col items-center animate-pulse">
                    <AlertTriangle className="w-12 h-12 text-red-600 mb-2" />
                    <h3 className="text-xl font-bold text-red-700">SOS ACTIVE</h3>
                    <p className="text-red-600 text-center">Security has been notified.<br />Help is on the way.</p>
                </div>

                {/* Show Modal if details not added and not dismissed */}
                {!activeSOS.isDetailsAdded && activeSOS.id !== dismissedEventId && (
                    <SOSPostTriggerModal
                        sosId={activeSOS.id}
                        onClose={handleModalClose}
                    />
                )}
            </>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="relative w-full select-none">
                <button
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleMouseDown}
                    onTouchEnd={handleMouseUp}
                    className={cn(
                        "w-full py-10 rounded-2xl text-2xl font-bold shadow-xl transition-all transform active:scale-95 flex flex-col items-center justify-center gap-3 overflow-hidden relative",
                        isPressed ? "bg-red-700 scale-95" : "bg-red-600 hover:bg-red-700",
                        "text-white"
                    )}
                >
                    {/* Progress Bar Background */}
                    <div
                        ref={progressBarRef}
                        className="absolute bottom-0 left-0 h-full bg-red-900 opacity-40 will-change-[width]"
                        style={{ width: '0%' }}
                    />

                    {/* Ripple Effect (Visual only for now) */}
                    {isPressed && (
                        <div className="absolute inset-0 rounded-2xl animate-ping bg-red-400 opacity-20" />
                    )}

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="p-4 bg-white/20 rounded-full mb-2 backdrop-blur-sm">
                            <AlertTriangle className="w-12 h-12 text-white" />
                        </div>
                        <span className="tracking-wider">{loading ? 'SENDING...' : 'SOS'}</span>
                        <span className="text-sm font-normal opacity-90">Long Press to Activate</span>
                    </div>
                </button>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center px-2">
                <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors
                        ${audioEnabled ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}
                    `}
                >
                    {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    Audio {audioEnabled ? 'ON' : 'OFF'}
                </button>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Near Library (GPS Active)</span>
                </div>
            </div>
        </div>
    );
}
