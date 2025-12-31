import { useEffect, useState } from 'react';
import { Footprints, Clock, MapPin, Shield } from 'lucide-react';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { motion } from 'framer-motion';

interface ActiveWalksListProps {
    onSelectWalk: (walk: SafeWalkSession) => void;
    hostelFilter?: string;
}

export default function ActiveWalksList({ onSelectWalk, hostelFilter }: ActiveWalksListProps) {
    const [walks, setWalks] = useState<SafeWalkSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delayed' | 'danger' | 'escort'>('all');

    useEffect(() => {
        const unsubscribe = safeWalkService.subscribeToActiveWalks((data) => {
            setWalks(data);
            setLoading(false);
        }, hostelFilter);

        return () => unsubscribe();
    }, [hostelFilter]);

    // Filter walks based on selected status
    const filteredWalks = walks.filter(walk => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'active') return walk.status === 'active';
        if (statusFilter === 'delayed') return walk.status === 'delayed';
        if (statusFilter === 'danger') return walk.status === 'danger';
        if (statusFilter === 'escort') return walk.escortRequested && !walk.assignedEscort;
        return true;
    });

    if (loading) {
        return <div className="p-4 text-center text-slate-500">Loading active walks...</div>;
    }


    return (
        <div className="space-y-4">
            {/* Status Filter Dropdown */}
            <div className="relative group">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/40 text-sm font-black text-slate-700 uppercase tracking-widest outline-none appearance-none shadow-lg cursor-pointer transition-all hover:bg-white/30"
                >
                    <option value="all">Live Overview ({walks.length})</option>
                    <option value="active">Active Track</option>
                    <option value="delayed">Delay Alerts</option>
                    <option value="danger">Emergency</option>
                    <option value="escort">Escort Req.</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <Shield className="w-4 h-4 text-slate-800" />
                </div>
            </div>

            {filteredWalks.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-[2.5rem] border border-white/50 shadow-xl bg-white/5">
                    <Footprints className="w-10 h-10 text-slate-300 mx-auto mb-4 opacity-30" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Active Missions</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredWalks.map((walk) => (
                        <motion.div
                            key={walk.id}
                            layoutId={walk.id}
                            onClick={() => onSelectWalk(walk)}
                            className={`glass-card p-6 rounded-[2.2rem] cursor-pointer transition-all border-2 shadow-xl hover:-translate-y-1 active:scale-95 ${walk.status === 'danger' ? 'border-red-500/50 bg-red-500/5' :
                                walk.status === 'delayed' ? 'border-orange-500/50 bg-orange-500/5' :
                                    'border-white/50 hover:border-white/80'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-slate-700 border border-white/80 shadow-sm text-lg">
                                        {walk.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-lg leading-tight">{walk.userName}</h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{walk.userHostel || 'Campus'}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.1em] border shadow-sm ${walk.status === 'danger' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                    walk.status === 'delayed' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    }`}>
                                    {walk.status}
                                </span>
                            </div>

                            <div className="bg-white/30 backdrop-blur-md p-4 rounded-2xl border border-white/60 space-y-3 shadow-sm text-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-emerald-100/50 rounded-lg">
                                        <MapPin className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <span className="font-bold text-slate-700 truncate">{walk.destination.name}</span>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-white/40 text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-primary opacity-60" />
                                        {walk.expectedDuration}m limit
                                    </span>
                                    {walk.assignedEscort && <span className="text-emerald-600 font-black">Escort: {walk.assignedEscort}</span>}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
