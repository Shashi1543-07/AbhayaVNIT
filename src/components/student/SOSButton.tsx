import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2, Plus, Skull } from 'lucide-react';
import { sosService } from '../../services/sosService';
import { useAuthStore } from '../../context/authStore';
import gsap from 'gsap';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

interface SOSButtonProps {
    onActivate?: (type: 'medical' | 'harassment' | 'general') => void;
    disabled?: boolean;
}

export default function SOSButton({ onActivate, disabled }: SOSButtonProps) {
    const { user, profile } = useAuthStore();
    const [isLongPressing, setIsLongPressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationStatus, setLocationStatus] = useState('Locating...');
    const [sosId, setSosId] = useState<string | null>(null);
    const [dragType, setDragType] = useState<'medical' | 'harassment' | 'general'>('general');

    const buttonRef = useRef<HTMLButtonElement>(null);
    const timerRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);
    const startYRef = useRef<number>(0);

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
        if (isActive || disabled) return;
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

        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / 2500) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                // Auto-trigger if reached 100% without release (though we usually wait for release or trigger here)
                // For "One-hand panic", auto-triggering on 100% is good.
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

        // Move button slightly with drag (GSAP) - Smoother easing
        gsap.to(buttonRef.current, {
            y: -deltaY * 0.25, // Slightly reduced multiplier for better control
            duration: 0.3,
            ease: "power2.out"
        });
    };

    const handleEnd = () => {
        if (isActive) return;

        if (progress >= 100) {
            activateSOS();
        } else {
            // Cancel and Snap back
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

        // 1. Check User
        if (!user) {
            alert("Cannot trigger SOS: User identification missing. Please relogin.");
            return;
        }

        setIsActive(true);
        setIsLongPressing(false);

        // GSAP Activation Animation
        gsap.to(buttonRef.current, {
            y: 0,
            scale: 1.15,
            duration: 0.5,
            ease: "back.out(1.7)"
        });

        const finalType = dragType;
        if (onActivate) onActivate(finalType);

        // 2. Get Location (Use tracked or fetch one-time)
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
                // Fallback or Alert? 
                // For safety, maybe send with 0,0 or handle gracefully?
                // Let's alert for now as per "Missing user or location data" request context, 
                // but trying hard to get it first.
                // Or better: Send with null location if allowed by rules (rules require number).
                // If rules require number, we must fail or send approximate.
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
                'manual_gesture',
                undefined
            );

            if (typeof result === 'object') {
                setSosId(result.sosId);
            } else {
                setSosId(result);
            }
        } catch (error) {
            console.error("Failed to trigger SOS", error);
            alert("Failed to send SOS alert. Please call emergency contacts directly.");
            setIsActive(false);
        }
    };

    const cancelSOS = async () => {
        if (!confirm("Are you sure you want to cancel the emergency alert?")) return;

        if (sosId && user) {
            await sosService.resolveSOS(sosId, user.uid, "Cancelled by student");
        }

        setIsActive(false);
        setProgress(0);
        setIsLongPressing(false);
        setSosId(null);
    };

    return (
        <div className="flex flex-col items-center justify-center w-full py-12 relative overflow-visible">
            {/* Gesture Hints */}
            {isLongPressing && (
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 transition-all duration-300 ${dragType === 'medical' ? 'scale-125 text-red-600 opacity-100' : 'scale-100 text-slate-400 opacity-40'}`}>
                        <Plus className="w-12 h-12" />
                        <span className="text-xs font-bold block text-center">MEDICAL</span>
                    </div>
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 transition-all duration-300 ${dragType === 'harassment' ? 'scale-125 text-purple-600 opacity-100' : 'scale-100 text-slate-400 opacity-40'}`}>
                        <Skull className="w-12 h-12" />
                        <span className="text-xs font-bold block text-center">THREAT</span>
                    </div>
                </div>
            )}

            {/* 3D Visual Feedback */}
            {isLongPressing && (
                <div className="absolute w-[300px] h-[300px] pointer-events-none opacity-50">
                    <Canvas camera={{ position: [0, 0, 3] }}>
                        <RotatingRing progress={progress} type={dragType} />
                    </Canvas>
                </div>
            )}

            {/* Pulse Effects */}
            {isLongPressing && !isActive && (
                <div className="absolute w-64 h-64 rounded-full bg-red-100 animate-ping opacity-75" />
            )}
            {isActive && (
                <div className="absolute w-96 h-96 rounded-full bg-red-500 animate-ping opacity-20 duration-1000" />
            )}

            {/* Main Button */}
            <button
                ref={buttonRef}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
                className={`relative w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all
                    ${isActive ? 'bg-red-700' : 'bg-gradient-to-br from-red-500 to-red-600'}
                    ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    z-20
                `}
                disabled={disabled}
            >
                {/* Visual Glow for Drag Type */}
                {!isActive && isLongPressing && (
                    <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 ${dragType === 'medical' ? 'bg-red-400 opacity-60' :
                        dragType === 'harassment' ? 'bg-purple-400 opacity-60' :
                            'bg-red-200 opacity-40'
                        }`} />
                )}

                {/* Progress Ring */}
                {!isActive && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none scale-[1.05]">
                        <circle
                            cx="96" cy="96" r="94"
                            fill="none"
                            stroke={dragType === 'medical' ? '#ef4444' : dragType === 'harassment' ? '#a855f7' : '#ffffff'}
                            strokeWidth="6"
                            strokeDasharray="590"
                            strokeDashoffset={590 - (590 * progress) / 100}
                            className="transition-colors duration-300"
                        />
                    </svg>
                )}

                <div className="text-center text-white z-10 select-none">
                    <span className="text-4xl font-black tracking-wider block mb-1">
                        {disabled ? 'WAIT' : 'SOS'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide">
                        {isActive ? 'SENT' : disabled ? 'ACTIVE' : dragType === 'medical' ? 'MEDICAL' : dragType === 'harassment' ? 'THREAT' : 'HOLD'}
                    </span>
                </div>
            </button>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-center w-full z-10">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    {locationStatus === 'Locating...' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-emerald-500" />}
                    <span className="font-medium tracking-wide">{locationStatus}</span>
                </div>
            </div>

            {isActive && (
                <div className="mt-8 text-center bg-red-50 p-6 rounded-3xl border border-red-100 shadow-inner z-10">
                    <p className="text-red-700 font-bold text-lg animate-pulse mb-1">Emergency Help Requested</p>
                    <p className="text-sm text-red-600/80 mb-4 font-medium uppercase tracking-tighter">
                        Type: {dragType === 'general' ? 'Critical' : dragType}
                    </p>
                    <button
                        onClick={cancelSOS}
                        className="px-6 py-2 bg-white text-slate-500 text-xs font-bold rounded-full border border-slate-200 hover:text-red-600 hover:border-red-200 shadow-sm transition-all"
                    >
                        CANCEL EMERGENCY
                    </button>
                </div>
            )}
        </div>
    );
}

function RotatingRing({ progress, type }: { progress: number; type: string }) {
    const ringRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (ringRef.current) {
            ringRef.current.rotation.z += delta * (progress / 20 + 0.5);
            ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.05);
        }
    });

    const color = type === 'medical' ? '#ef4444' : type === 'harassment' ? '#a855f7' : '#ffffff';

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={ringRef}>
                <ringGeometry args={[1.3, 1.35, 64]} />
                <meshBasicMaterial color={color} transparent opacity={0.6} side={2} />
            </mesh>
        </Float>
    );
}
