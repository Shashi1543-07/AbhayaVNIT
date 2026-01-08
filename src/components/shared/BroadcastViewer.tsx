import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Clock, X } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { broadcastService } from '../../services/broadcastService';

interface BroadcastViewerProps {
    isOpen: boolean;
    onClose: () => void;
    role: 'student' | 'warden' | 'security';
}

export default function BroadcastViewer({ isOpen, onClose, role }: BroadcastViewerProps) {
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { profile } = useAuthStore();
    const userHostel = profile?.hostelId || profile?.hostel || '';

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        // Using the updated service method to get all broadcasts
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((allBroadcasts) => {
            // Filter relevant broadcasts based on role and hostel
            const relevant = allBroadcasts.filter((b: any) => {
                // Admin broadcasts: check targetGroup
                if (b.senderRole === 'admin') {
                    return b.targetGroup === 'all' || b.targetGroup === role;
                }

                // Warden broadcasts: check hostel match
                if (b.senderRole === 'warden') {
                    // Students only see theirs, wardens/security see all for transparency or can be filtered further
                    if (role === 'student') return b.hostelId === userHostel;
                    return true;
                }

                // Security broadcasts: visible to all
                if (b.senderRole === 'security') return true;

                // Fallback for older broadcasts (optional but safe)
                if (!b.senderRole && b.targetGroup === 'all') return true;
                if (!b.senderRole && b.targetGroup === role) return true;

                return false;
            });

            setBroadcasts(relevant);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, role, userHostel]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-[400px] sm:max-w-[440px] glass-card bg-white/90 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col mx-auto"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-200/50 flex justify-between items-center bg-white/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                                    <Megaphone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Campus Announcements</h2>
                                    <p className="text-xs text-slate-500">Official alerts and updates</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto p-6 space-y-4 min-h-[300px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                                    <p className="text-sm">Loading announcements...</p>
                                </div>
                            ) : broadcasts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                    <div className="bg-slate-100 p-4 rounded-full mb-3">
                                        <Megaphone className="w-8 h-8 opacity-40" />
                                    </div>
                                    <p className="font-medium text-slate-600">No recent announcements</p>
                                    <p className="text-sm mt-1">You're all caught up!</p>
                                </div>
                            ) : (
                                broadcasts.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`relative p-5 rounded-xl border ${item.priority === 'emergency'
                                            ? 'bg-red-50/80 border-red-200 shadow-red-100'
                                            : item.priority === 'warning'
                                                ? 'bg-orange-50/80 border-orange-200 shadow-orange-100'
                                                : 'bg-white/60 border-indigo-100 shadow-sm'
                                            } shadow-md transition-all hover:shadow-lg`}
                                    >
                                        {/* Priority Badge */}
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                ${item.priority === 'emergency'
                                                    ? 'bg-red-100 text-red-700'
                                                    : item.priority === 'warning'
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                }`}
                                            >
                                                {item.priority}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                    {item.createdAt?.seconds
                                                        ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                                                        : 'Just now'}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">
                                            {item.title}
                                        </h3>

                                        <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                            {item.message}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                                            <span className={`text-[10px] font-bold uppercase py-1 px-2 rounded-md ${item.senderRole === 'admin' ? 'bg-indigo-50 text-indigo-600' :
                                                item.senderRole === 'security' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-blue-50 text-blue-600'
                                                }`}>
                                                From: {item.senderRole}
                                                {item.senderRole === 'warden' && ` (Hostel ${item.hostelId})`}
                                            </span>
                                            {item.targetGroup && item.targetGroup !== 'all' && (
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                                    Target: {item.targetGroup}
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
