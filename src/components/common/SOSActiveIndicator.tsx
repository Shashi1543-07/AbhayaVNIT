import { useEffect, useState } from 'react';
import { AlertTriangle, MapPin, Loader2, XCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import SOSPlugin from '../../services/nativeSOS';
import { sosService } from '../../services/sosService';

export default function SOSActiveIndicator() {
    const [sosId, setSosId] = useState<string | null>(null);
    const [isNative, setIsNative] = useState(false);
    const [isStopping, setIsStopping] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());

        const checkSOS = () => {
            const activeId = localStorage.getItem('active_sos_id');
            setSosId(activeId);
        };

        checkSOS();

        // Listen for storage changes (in case of multi-tab or triggered elsewhere)
        window.addEventListener('storage', checkSOS);

        // Also check native service status
        if (Capacitor.isNativePlatform()) {
            SOSPlugin.isServiceRunning().then(res => {
                if (res.running && !localStorage.getItem('active_sos_id')) {
                    // Sync issue: service running but web layer doesn't know
                    // We should ideally fetch the latest SOS from Firestore if possible,
                    // but for now we just show a generic active state.
                }
            });
        }

        const interval = setInterval(checkSOS, 5000);
        return () => {
            window.removeEventListener('storage', checkSOS);
            clearInterval(interval);
        };
    }, []);

    const handleStop = async () => {
        if (!sosId) return;
        if (window.confirm("⚠️ Are you sure you want to stop emergency tracking?\n\nThis will stop sharing your location with security immediately.")) {
            setIsStopping(true);
            try {
                await sosService.cancelSOS(sosId);
                setSosId(null);
            } catch (err: any) {
                alert("Failed to stop SOS: " + err.message);
            } finally {
                setIsStopping(false);
            }
        }
    };

    if (!sosId) return null;

    return (
        <div className="fixed top-[72px] left-0 right-0 z-[9999] animate-in slide-in-from-top duration-500 px-4">
            <div className="bg-red-600 text-white px-4 py-3 shadow-2xl flex items-center justify-between border border-white/20 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-sm leading-tight">🚨 SOS IS ACTIVE</p>
                        <p className="text-[10px] opacity-90 uppercase tracking-widest ont-medium">
                            {isNative ? 'Background tracking active' : 'Live sharing active'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleStop}
                        disabled={isStopping}
                        className="bg-white/10 hover:bg-white/25 active:scale-95 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5 transition-all"
                    >
                        {isStopping ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-wider">Stop</span>
                    </button>

                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 scale-90">
                        <MapPin className="w-3.5 h-3.5 animate-bounce" />
                        <span className="text-[10px] font-bold">LIVE</span>
                    </div>
                </div>
            </div>

            <div className="mt-1 flex justify-center">
                <div className="bg-red-700/80 backdrop-blur-md text-white/90 text-[8px] px-3 py-0.5 rounded-full border border-red-800/30 flex items-center gap-2 shadow-lg">
                    <span className="font-black uppercase tracking-widest border-r border-white/20 pr-2">Emergency Mode</span>
                    <span>LOGOUT WILL NOT STOP TRACKING</span>
                </div>
            </div>
        </div>
    );
}
