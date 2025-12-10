import { MapPin, Shield } from 'lucide-react';

export default function ActiveStatusCard() {
    // Mock State - Replace with real data later
    const activeStatus = {
        type: 'safewalk', // 'safewalk' | 'escort' | null
        destination: 'Hostel 6',
        timeLeft: '06:12',
        guardName: 'Rajesh Sharma'
    };

    if (!activeStatus.type) return null;

    return (
        <div className="gradient-pink-purple rounded-2xl p-5 text-white shadow-lg mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                            {activeStatus.type === 'safewalk' ? 'Safe Walk Active' : 'Escort Assigned'}
                        </span>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-lg font-mono">
                        {activeStatus.timeLeft}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        {activeStatus.type === 'safewalk' ? <MapPin className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">
                            {activeStatus.type === 'safewalk' ? `To ${activeStatus.destination}` : `Guard: ${activeStatus.guardName}`}
                        </h3>
                        <p className="text-sm text-white/80">
                            {activeStatus.type === 'safewalk' ? 'Tracking active' : 'ETA: 2 min'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
