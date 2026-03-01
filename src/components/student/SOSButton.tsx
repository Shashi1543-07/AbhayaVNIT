import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { sosService } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';
import { useSOS } from '../../features/sos/useSOS';
import gsap from 'gsap';


interface SOSButtonProps {
    onActivate?: (type: 'medical' | 'harassment' | 'general') => void;
    disabled?: boolean;
}

export default function SOSButton({ onActivate, disabled }: SOSButtonProps) {
    const { user, profile } = useAuthStore();
    const { activeSOS } = useSOS();
    const [isLongPressing, setIsLongPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState('Locating...');
    const [dragType, setDragType] = useState<'medical' | 'harassment' | 'general'>('general');

    const buttonRef = useRef<HTMLButtonElement>(null);
    const progressCircleRef = useRef<SVGCircleElement>(null);
    const progressTween = useRef<gsap.core.Tween | null>(null);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);
    const startYRef = useRef<number>(0);

    const globalActive = !!(activeSOS && !activeSOS.status?.resolved);

    const locationRef = useRef<{ lat: number; lng: number } | null>(null);

    // Sync ref with state for use in logic that shouldn't trigger re-renders
    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    // Sync local isActive with globalActive
    useEffect(() => {
        setIsActive(!!(activeSOS && !activeSOS.status?.resolved));
    }, [globalActive, activeSOS?.id]);

    // Get Location on Mount
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setLocationStatus('GPS Not Supported');
            return;
        }

        const handleGeoError = (error: GeolocationPositionError) => {
            console.warn('Geolocation Watch Error:', error);

            // Use ref to check location without triggering re-runs
            if (error.code === 3 && locationRef.current) {
                setLocationStatus('Location Active');
                return;
            }

            if (error.code === 3) {
                setLocationStatus('Retrying Location...');
                return;
            }

            setLocationStatus('Location Error');
        };

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLoc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setLocation(newLoc);
                setLocationStatus('Location Active');
            },
            handleGeoError,
            {
                enableHighAccuracy: false,
                timeout: 30000,
                maximumAge: 60000
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []); // Empty dependency array to mount once

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (isActive || disabled || globalActive) return;

        // Prevent scrolling and default actions
        if (e.cancelable) e.preventDefault();

        setIsLongPressing(true);
        startTimeRef.current = Date.now();
        startYRef.current = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragType('general');

        gsap.to(buttonRef.current, {
            scale: 0.9,
            duration: 0.2,
            ease: "power2.out"
        });

        Haptics.impact({ style: ImpactStyle.Light });

        Haptics.impact({ style: ImpactStyle.Light });

        // Kill any existing progress tween
        if (progressTween.current) progressTween.current.kill();

        // High performance progress animation with GSAP
        progressTween.current = gsap.to({}, {
            duration: 1.5,
            ease: "none",
            onUpdate: function () {
                const p = this.progress() * 100;
                setProgress(p);

                // Update SVG directly for maximum performance
                if (progressCircleRef.current) {
                    const offset = 615 - (615 * this.progress());
                    progressCircleRef.current.style.strokeDashoffset = offset.toString();
                }

                // Haptic feedback at milestones
                if (Math.floor(p / 20) > Math.floor(progress / 20)) {
                    Haptics.impact({ style: ImpactStyle.Light });
                }
            },
            onComplete: () => {
                Haptics.notification({ type: 'SUCCESS' as any });
                activateSOS();
            }
        });
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (isActive) return;

        const currentY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        const deltaY = startYRef.current - currentY;

        if (deltaY > 40) {
            setDragType('harassment');
        } else if (deltaY < -40) {
            setDragType('medical');
        } else {
            setDragType('general');
        }

        gsap.to(buttonRef.current, {
            y: -deltaY * 0.5,
            duration: 0,
            ease: "none"
        });
    };

    const handleEnd = () => {
        if (isActive) return;

        // We check current progress state via a ref if needed, but here we can just check if long pressing was true
        setIsLongPressing(false);
        if (progressTween.current) {
            progressTween.current.kill();
            progressTween.current = null;
        }
        setProgress(0);

        // Reset SVG
        if (progressCircleRef.current) {
            progressCircleRef.current.style.strokeDashoffset = "615";
        }

        if (timerRef.current) clearInterval(timerRef.current);

        gsap.to(buttonRef.current, {
            y: 0,
            scale: 1,
            duration: 0.3,
            ease: "power3.out"
        });
    };

    useEffect(() => {
        const button = buttonRef.current;
        if (!button) return;

        const startListener = (e: any) => handleStart(e);
        button.addEventListener('mousedown', startListener, { passive: false });
        button.addEventListener('touchstart', startListener, { passive: false });

        return () => {
            button.removeEventListener('mousedown', startListener);
            button.removeEventListener('touchstart', startListener);
        };
    }, [isActive, disabled, globalActive]); // Only rebind if core blocking states change

    useEffect(() => {
        if (isLongPressing) {
            window.addEventListener('mousemove', handleMove, { passive: false });
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isLongPressing]); // Only rebind when long pressing starts/stops

    const activateSOS = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (isActive) return;

        if (!user) {
            alert("Cannot trigger SOS: User identification missing. Please relogin.");
            return;
        }

        setIsActive(true);
        setIsLongPressing(false);

        gsap.to(buttonRef.current, {
            y: 0,
            scale: 1.15,
            duration: 0.5,
            ease: "back.out(1.7)"
        });

        const finalType = dragType;
        if (onActivate) onActivate(finalType);

        let finalLocation = location;

        if (!finalLocation) {
            try {
                // Try to get any location (priority on speed)
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 5000,
                        maximumAge: 300000 // 5 minutes old is better than nothing in an emergency
                    });
                });
                finalLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            } catch (err) {
                console.warn("Fast location fetch failed, trying one last time with 10s timeout...", err);
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: false,
                            timeout: 10000,
                            maximumAge: 0
                        });
                    });
                    finalLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                } catch (lastErr) {
                    console.error("Emergency location fetch failed completely:", lastErr);
                }
            }
            if (finalLocation) setLocation(finalLocation);
        }

        if (!finalLocation) {
            alert("Cannot trigger SOS: Location unavailable. Ensure GPS is on.");
            setIsActive(false);
            setLocationStatus('Location Error');
            return;
        }

        try {
            const sosUser = { ...user, ...profile };
            const result = await sosService.triggerSOS(
                sosUser,
                finalLocation,
                finalType === 'general' ? 'other' : finalType,
                'manual_gesture'
            );

            if (typeof result === 'object' && result?.sosId) {
                // Tracking locally if needed
            }
        } catch (error) {
            console.error("Failed to trigger SOS", error);
            alert("Failed to send SOS alert. Please call emergency contacts directly.");
            setIsActive(false);
        }
    };


    return (
        <div className="flex flex-col items-center justify-center w-full py-32 relative bg-transparent overflow-visible touch-none">
            {isActive && (
                <>
                    {/* Centered Breathing Red Glow - Using Optimized CSS class */}
                    <div
                        className="absolute rounded-full bg-red-600/40 blur-[80px] z-5 pointer-events-none"
                        style={{
                            width: '400px',
                            height: '400px',
                            animation: 'breathe-gpu 3s ease-in-out infinite'
                        }}
                    />
                    <div
                        className="absolute rounded-full bg-red-600/20 blur-[100px] z-10 pointer-events-none"
                        style={{
                            width: '600px',
                            height: '600px',
                            animation: 'breathe-gpu 3s ease-in-out infinite 0.5s'
                        }}
                    />
                </>
            )}

            <button
                ref={buttonRef}
                className={`relative w-56 h-56 rounded-full flex items-center justify-center will-change-transform transition-colors
                    ${isActive
                        ? 'bg-[#b91c1c] scale-110 border-4 border-[#D4AF37]/50 shadow-[0_0_100px_rgba(220,38,38,0.7)]'
                        : 'bg-[#dc2626] border-2 border-[#D4AF37]/40 shadow-[0_0_80px_rgba(212,175,55,0.2),inset_0_-12px_40px_rgba(0,0,0,0.6)]'
                    }
                    ${disabled && !isActive ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    z-20 active:scale-95 transition-transform duration-300
                `}
                disabled={disabled && !isActive}
            >

                {!isActive && isLongPressing && (
                    <div className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-300 ${dragType === 'medical' ? 'bg-red-500/40' :
                        dragType === 'harassment' ? 'bg-amber-500/40' :
                            'bg-red-400/20'
                        }`} />
                )}

                {!isActive && (
                    <svg viewBox="0 0 208 208" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-1">
                        <circle
                            ref={progressCircleRef}
                            cx="104" cy="104" r="98"
                            fill="none"
                            stroke="#D4AF37"
                            strokeWidth="5"
                            strokeDasharray="615"
                            strokeDashoffset="615"
                            style={{
                                filter: "drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))",
                                willChange: "stroke-dashoffset"
                            }}
                        />
                    </svg>
                )}

                <div className="text-center text-white z-10 select-none">
                    <span className="text-6xl font-black tracking-tighter block mb-1 drop-shadow-xl">
                        {isActive ? 'WAIT' : 'SOS'}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-90 drop-shadow-sm">
                        {isActive ? 'ACTIVE' : dragType === 'medical' ? 'MEDICAL' : dragType === 'harassment' ? 'THREAT' : 'PRESS'}
                    </span>
                </div>
            </button>

            <div className={`${isActive ? "mt-10" : "mt-20"} flex items-center justify-center w-full z-10`}>
                <div className="flex items-center gap-2.5 text-zinc-500 text-[12px] font-black uppercase tracking-[0.2em] bg-black/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                    {locationStatus === 'Locating...' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-emerald-500" />}
                    <span className="font-heading opacity-80">{locationStatus}</span>
                </div>
            </div>

        </div>
    );
}
