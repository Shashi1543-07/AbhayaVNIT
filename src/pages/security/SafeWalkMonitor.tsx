import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileWrapper from '../../components/layout/MobileWrapper';
import TopHeader from '../../components/layout/TopHeader';
import BottomNav from '../../components/layout/BottomNav';
import { securityNavItems } from '../../lib/navItems';
import { safeWalkService, type SafeWalkSession } from '../../services/safeWalkService';
import { MapPin, Clock, Shield, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import SecurityOverviewMap from '../../components/map/SecurityOverviewMap';

export default function SafeWalkMonitor() {
    const navigate = useNavigate();
    const [activeWalks, setActiveWalks] = useState<SafeWalkSession[]>([]);

    useEffect(() => {
        const unsubscribe = safeWalkService.subscribeToActiveWalks((walks) => {
            setActiveWalks(walks);
        });
        return () => unsubscribe();
    }, []);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'paused': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            case 'delayed': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            case 'danger': return 'bg-red-500/10 text-red-600 border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
        }
    };

    const getElapsedTime = (walk: SafeWalkSession) => {
        const startTime = walk.startTime?.toDate ? walk.startTime.toDate() : new Date(walk.startTime as any);
        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 60000);
        return `${elapsed} mins elapsed`;
    };

    return (
        <MobileWrapper>
            <TopHeader title="Safe Walk Monitor" showBackButton={true} />
            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Header Section */}
                <motion.div variants={cardVariant} className="glass-card p-6 rounded-[2rem] border border-white/50 shadow-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Active Walks</h2>
                        <p className="text-sm text-slate-500 font-medium opacity-80">{activeWalks.length} students currently tracking</p>
                    </div>
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm text-primary">
                        <Shield className="w-8 h-8" />
                    </div>
                </motion.div>

                {/* Map View - Glass Container */}
                <motion.div variants={cardVariant} className="glass-card p-2 rounded-[2.5rem] border border-white/50 shadow-2xl overflow-hidden h-[320px] relative">
                    <div className="w-full h-full rounded-[2.2rem] overflow-hidden border border-white/40">
                        <SecurityOverviewMap sosEvents={[]} activeWalks={activeWalks} />
                    </div>
                    {activeWalks.length > 0 && (
                        <div className="absolute bottom-6 left-6 right-6 bg-white/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/60 shadow-lg z-[1000] text-center">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Global Live Feed</p>
                        </div>
                    )}
                </motion.div>

                {/* Main Content Area */}
                <div className="space-y-6">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Student Sessions</h3>

                    {activeWalks.length === 0 ? (
                        <motion.div variants={cardVariant} className="glass-card p-12 rounded-[2.5rem] text-center border border-white/50 shadow-xl">
                            <Navigation className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                            <p className="text-slate-400 font-bold">No active safe walks</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-4">
                            {activeWalks.map((walk) => (
                                <motion.div
                                    key={walk.id}
                                    layoutId={walk.id}
                                    onClick={() => navigate(`/security/safe-walk/${walk.id}`)}
                                    className="glass-card p-6 rounded-[2.2rem] cursor-pointer transition-all border-2 border-white/50 shadow-xl hover:-translate-y-1 active:scale-95"
                                >
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-white/60 to-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-slate-700 border border-white/80 shadow-sm text-lg">
                                                {walk.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg leading-tight">{walk.userName}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{walk.hostelId || 'Campus'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm ${getStatusStyles(walk.status)}`}>
                                            {walk.status}
                                        </span>
                                    </div>

                                    <div className="bg-white/30 backdrop-blur-md p-4 rounded-2xl border border-white/60 space-y-3 shadow-sm">
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="p-1.5 bg-emerald-100/50 rounded-lg">
                                                <MapPin className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <span className="font-bold text-slate-700 truncate">{walk.destination.name}</span>
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t border-white/40 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                                            <span className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-primary opacity-60" />
                                                {getElapsedTime(walk)}
                                            </span>
                                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 italic">{walk.expectedDuration}m limit</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.main>
            <BottomNav items={securityNavItems} />
        </MobileWrapper>
    );
}
