import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { sosService } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';
import { useSOS } from '../../features/sos/useSOS';
import gsap from 'gsap';
import SpacetimeWarp from './SpacetimeWarp';


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
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);
    const startYRef = useRef<number>(0);

    const globalActive = !!(activeSOS && !activeSOS.status?.resolved);

    // Sync local isActive with globalActive
    useEffect(() => {
        if (globalActive) {
            setIsActive(true);
        } else {
            setIsActive(false);
        }
    }, [globalActive, activeSOS?.id]);

    // Get Location on Mount
    useEffect(() => {
        if ('geolocation' in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLocationStatus('Location Active');
                },
                (error) => {
                    console.error('Location error:', error);
                    setLocationStatus('Location Error');
                },
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        } else {
            setLocationStatus('GPS Not Supported');
        }
    }, []);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (isActive || disabled || globalActive) return;
        setIsLongPressing(true);
        startTimeRef.current = Date.now();
        startYRef.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragType('general');

        // GSAP Pulse Initialization
        gsap.to(buttonRef.current, {
            scale: 0.9,
            duration: 0.2,
            ease: "power2.out"
        });

        // Haptic Feedback
        Haptics.impact({ style: ImpactStyle.Light });

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / 2500) * 100, 100);

            // Haptic ticks every 20% progress
            if (Math.floor(newProgress / 20) > Math.floor(progress / 20)) {
                Haptics.impact({ style: ImpactStyle.Light });
            }

            setProgress(newProgress);

            if (newProgress >= 100) {
                Haptics.notification({ type: 'SUCCESS' as any });
                activateSOS();
            }
        }, 50);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isLongPressing || isActive) return;

        const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const deltaY = startYRef.current - currentY; // Up is positive

        if (deltaY > 50) {
            setDragType('medical');
        } else if (deltaY < -50) {
            setDragType('harassment');
        } else {
            setDragType('general');
        }

        gsap.to(buttonRef.current, {
            y: -deltaY * 0.25,
            duration: 0.3,
            ease: "power2.out"
        });
    };

    const handleEnd = () => {
        if (isActive) return;

        if (progress >= 100) {
            activateSOS();
        } else {
            setIsLongPressing(false);
            setProgress(0);
            if (timerRef.current) clearInterval(timerRef.current);

            gsap.to(buttonRef.current, {
                y: 0,
                scale: 1,
                duration: 0.6,
                ease: "elastic.out(1, 0.3)"
            });
        }
    };

    useEffect(() => {
        if (isLongPressing) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isLongPressing, progress, dragType]);

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
            setLocationStatus('Fetching location...');
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });
                finalLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setLocation(finalLocation);
            } catch (err) {
                console.error("Failed to get one-time location:", err);
            }
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
        <div className="flex flex-col items-center justify-center w-full py-14 relative bg-transparent overflow-visible">
            {/* Realistic Three.js Spacetime Warp - isolated in extreme background and shifted UP */}
            <div className="absolute inset-x-[-100px] top-[-100px] h-[500px] z-[-1]">
                <SpacetimeWarp />
            </div>

            {/* Stable Celestial Glow */}
            <div className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,#D4AF37_0%,transparent_70%)] blur-[110px] pointer-events-none opacity-[0.2]" />

            {/* Mass Shadows */}
            <div className="absolute w-[240px] h-[70px] bg-black/80 blur-2xl rounded-[100%] translate-y-[35px] opacity-80" />
            <div className="absolute w-[280px] h-[90px] bg-black/50 blur-3xl rounded-[100%] translate-y-[45px] opacity-60" />

            {isLongPressing && !isActive && (
                <div className="absolute w-64 h-64 rounded-full bg-red-600/30 animate-ping opacity-75 z-10" />
            )}
            {isActive && (
                <div className="absolute w-[450px] h-[450px] rounded-full bg-red-600/10 animate-ping opacity-20 duration-1000 z-10" />
            )}

            <button
                ref={buttonRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                className={`relative w-52 h-52 rounded-full flex items-center justify-center transition-all overflow-hidden
                    ${isActive
                        ? 'bg-[#991b1b] scale-110 border-4 border-[#D4AF37]/50 ripple-red shadow-[0_0_150px_rgba(220,38,38,0.8)]'
                        : 'bg-gradient-to-br from-[#dc2626] via-[#991b1b] to-[#1a1a1a] border-2 border-[#D4AF37]/30 shadow-[0_0_120px_rgba(212,175,55,0.25),inset_0_-12px_40px_rgba(0,0,0,0.9),inset_0_12px_40px_rgba(255,255,255,0.2)]'
                    }
                    ${disabled && !isActive ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    z-20 active:scale-95
                `}
                disabled={disabled && !isActive}
            >
                {/* Light Source / Atmosphere */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.25)_0%,transparent_65%)] pointer-events-none" />
                {!isActive && isLongPressing && (
                    <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 ${dragType === 'medical' ? 'bg-red-500/40' :
                        dragType === 'harassment' ? 'bg-amber-500/40' :
                            'bg-red-400/20'
                        }`} />
                )}

                {!isActive && (
                    <svg viewBox="0 0 208 208" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                            cx="104" cy="104" r="100"
                            fill="none"
                            stroke="#D4AF37"
                            strokeWidth="4"
                            strokeDasharray="628"
                            strokeDashoffset={628 - (628 * progress) / 100}
                            style={{ filter: "drop-shadow(0 0 8px rgba(212, 175, 55, 0.8))" }}
                            className="transition-all duration-300"
                        />
                    </svg>
                )}

                <div className="text-center text-white z-10 select-none">
                    <span className="text-5xl font-black tracking-tighter block mb-1 drop-shadow-md">
                        {isActive ? 'WAIT' : 'SOS'}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                        {isActive ? 'ACTIVE' : dragType === 'medical' ? 'MEDICAL' : dragType === 'harassment' ? 'THREAT' : 'PUSH'}
                    </span>
                </div>
            </button>

            <div className={`${isActive ? "mt-4" : "mt-8"} flex items-center justify-center w-full z-10`}>
                <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-black uppercase tracking-widest">
                    {locationStatus === 'Locating...' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-emerald-500" />}
                    <span className="font-heading">{locationStatus}</span>
                </div>
            </div>

        </div>
    );
}
