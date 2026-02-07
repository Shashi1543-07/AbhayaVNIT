import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { Megaphone, Send, Clock, Users, Trash2, Timer } from 'lucide-react';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { adminService } from '../../services/adminService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';
import TopHeader from '../../components/layout/TopHeader';
import { useAuthStore } from '../../context/authStore';

export default function Broadcasts() {
    const { user, profile } = useAuthStore();
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [priority, setPriority] = useState('info');
    const [durationHours, setDurationHours] = useState(24);
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<Broadcast[]>([]);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToAllBroadcastsWithExpired((broadcasts) => {
            setHistory(broadcasts);
        });
        return () => unsubscribe();
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message || !title || !user) return;

        setSending(true);
        try {
            await broadcastService.sendBroadcast({
                title,
                message,
                targetGroup: targetGroup as any,
                priority: priority as any,
                senderRole: 'admin',
                createdBy: profile?.name || user.email?.split('@')[0] || 'Admin',
                createdById: user.uid,
                durationHours
            });

            await adminService.logAction('Send Broadcast', targetGroup, `Sent ${priority} alert: ${title} (${durationHours}h expiry)`);

            setTitle('');
            setMessage('');
            setPriority('info');
            setDurationHours(24);
            alert('Broadcast sent successfully!');
        } catch (error) {
            console.error("Error sending broadcast:", error);
            alert('Failed to send broadcast.');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (broadcast: Broadcast) => {
        if (!confirm(`Delete "${broadcast.title}"? This cannot be undone.`)) return;

        setDeleting(broadcast.id);
        try {
            await broadcastService.deleteBroadcast(broadcast.id);
        } catch (error) {
            console.error("Error deleting broadcast:", error);
            alert('Failed to delete broadcast.');
        } finally {
            setDeleting(null);
        }
    };

    const isExpired = (broadcast: Broadcast) => broadcastService.isExpired(broadcast);
    const getTimeRemaining = (broadcast: Broadcast) => broadcastService.getTimeRemaining(broadcast);

    return (
        <MobileWrapper>
            <TopHeader title="Broadcasts & Alerts" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe space-y-6"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                {/* Send Form */}
                <motion.div variants={cardVariant} className="glass rounded-3xl p-6 border border-white/10">
                    <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
                        <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                            <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        New Announcement
                    </h2>

                    <form onSubmit={handleSend} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-zinc-500 font-medium mb-1.5">Target</label>
                                <select
                                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium"
                                    value={targetGroup}
                                    onChange={(e) => setTargetGroup(e.target.value)}
                                >
                                    <option value="all" className="bg-zinc-900">All Users</option>
                                    <option value="student" className="bg-zinc-900">Students</option>
                                    <option value="warden" className="bg-zinc-900">Wardens</option>
                                    <option value="security" className="bg-zinc-900">Security</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 font-medium mb-1.5">Priority</label>
                                <select
                                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="info" className="bg-zinc-900">Info</option>
                                    <option value="warning" className="bg-zinc-900">Warning</option>
                                    <option value="emergency" className="bg-zinc-900">Emergency</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 font-medium mb-1.5">Duration</label>
                            <select
                                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium"
                                value={durationHours}
                                onChange={(e) => setDurationHours(Number(e.target.value))}
                            >
                                <option value={1} className="bg-zinc-900">1 hour</option>
                                <option value={6} className="bg-zinc-900">6 hours</option>
                                <option value={12} className="bg-zinc-900">12 hours</option>
                                <option value={24} className="bg-zinc-900">24 hours (Default)</option>
                                <option value={48} className="bg-zinc-900">48 hours</option>
                                <option value={72} className="bg-zinc-900">72 hours</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 font-medium mb-1.5">Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Hostel Curfew Update"
                                required
                                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium placeholder:text-zinc-600"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-zinc-500 font-medium mb-1.5">Message</label>
                            <textarea
                                placeholder="Type your message..."
                                required
                                rows={4}
                                className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium resize-none placeholder:text-zinc-600"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#8B6E13] text-black py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            <Send className="w-4 h-4" />
                            {sending ? 'Sending...' : 'Send Broadcast'}
                        </button>
                    </form>
                </motion.div>

                {/* History */}
                <motion.div variants={cardVariant} className="glass rounded-3xl p-6 border border-white/10">
                    <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <Clock className="w-5 h-5 text-emerald-500" />
                        </div>
                        Recent Broadcasts
                    </h2>

                    <div className="space-y-3">
                        {history.length === 0 ? (
                            <p className="text-zinc-500 text-sm text-center py-8 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                No broadcasts yet
                            </p>
                        ) : (
                            history.map(item => {
                                const expired = isExpired(item);
                                // Allow delete if creator matches by ID or createdBy field, or admin can delete all
                                const canDelete = user?.uid === item.createdById || user?.uid === item.createdBy || profile?.role === 'admin';

                                return (
                                    <div
                                        key={item.id}
                                        className={`p-4 rounded-2xl border ${expired ? 'opacity-50 border-white/5 bg-white/5' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <div className="flex flex-wrap gap-2">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg
                                                    ${item.priority === 'emergency' ? 'bg-red-500/20 text-red-400' :
                                                        item.priority === 'warning' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-emerald-500/20 text-emerald-400'}`}>
                                                    {item.priority}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1
                                                    ${expired ? 'bg-red-500/20 text-red-400' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                                                    <Timer className="w-3 h-3" />
                                                    {getTimeRemaining(item)}
                                                </span>
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    disabled={deleting === item.id}
                                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                                    title="Delete broadcast"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                                        <p className="text-xs text-zinc-400 leading-relaxed mb-3">{item.message}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                            <Users className="w-3 h-3" />
                                            <span>{item.targetGroup}</span>
                                            <span>•</span>
                                            <span>{item.createdBy}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
