import { useState, useEffect } from 'react';
import MobileWrapper from '../../components/layout/MobileWrapper';
import BottomNav from '../../components/layout/BottomNav';
import { adminNavItems } from '../../lib/navItems';
import { Megaphone, Send, Clock, Users } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adminService } from '../../services/adminService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

import TopHeader from '../../components/layout/TopHeader';

export default function Broadcasts() {
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [priority, setPriority] = useState('info');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => {
            console.error("Error fetching broadcasts:", error);
        });
        return () => unsubscribe();
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message || !title) return;

        setSending(true);
        try {
            await addDoc(collection(db, 'broadcasts'), {
                title,
                message,
                targetGroup,
                priority,
                senderRole: 'admin',
                createdAt: serverTimestamp(),
                createdBy: 'Admin' // In real app, use auth.currentUser.email
            });

            await adminService.logAction('Send Broadcast', targetGroup, `Sent ${priority} alert: ${title}`);

            setTitle('');
            setMessage('');
            setPriority('info');
            alert('Broadcast sent successfully!');
            // fetchHistory(); // Handled by onSnapshot
        } catch (error) {
            console.error("Error sending broadcast:", error);
            alert('Failed to send broadcast.');
        } finally {
            setSending(false);
        }
    };

    return (
        <MobileWrapper>
            <TopHeader title="Broadcasts & Alerts" showBackButton={true} />

            <motion.main
                className="px-4 pt-nav-safe pb-nav-safe"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >

                <motion.div
                    className="flex flex-col items-center space-y-8"
                    variants={containerStagger}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Send Form */}
                    <motion.div variants={cardVariant} className="w-full max-w-2xl glass-card bg-black/40 p-6 rounded-[24px] shadow-sm border border-white/10">
                        <h2 className="text-lg font-heading font-black text-white mb-6 flex items-center gap-3 border-b border-white/10 pb-4 uppercase tracking-tight">
                            <div className="p-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                                <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            New Announcement
                        </h2>

                        <form onSubmit={handleSend} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Target Audience</label>
                                    <select
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold appearance-none"
                                        value={targetGroup}
                                        onChange={(e) => setTargetGroup(e.target.value)}
                                    >
                                        <option value="all" className="bg-zinc-900">All Users</option>
                                        <option value="student" className="bg-zinc-900">Students Only</option>
                                        <option value="warden" className="bg-zinc-900">Wardens Only</option>
                                        <option value="security" className="bg-zinc-900">Security Staff Only</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Priority Level</label>
                                    <select
                                        className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold appearance-none"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <option value="info" className="bg-zinc-900">Information (Blue)</option>
                                        <option value="warning" className="bg-zinc-900">Warning (Orange)</option>
                                        <option value="emergency" className="bg-zinc-900">Emergency (Red)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Hostel Curfew Update"
                                    required
                                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold placeholder:text-zinc-700"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Message</label>
                                <textarea
                                    placeholder="Type your message here..."
                                    required
                                    rows={5}
                                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-[#D4AF37]/50 text-white font-bold resize-none placeholder:text-zinc-700"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full bg-gradient-to-r from-[#CF9E1B] via-[#D4AF37] to-[#8B6E13] text-black py-4 rounded-xl font-black uppercase tracking-wider text-xs hover:shadow-lg hover:shadow-[#D4AF37]/20 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Send className="w-4 h-4" />
                                {sending ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </form>
                    </motion.div>

                    {/* History Sidebar */}
                    <div className="w-full max-w-2xl px-4 md:px-0">
                        <div className="glass-card bg-black/40 p-6 rounded-[24px] shadow-sm border border-white/10 flex flex-col">
                            <h2 className="text-lg font-heading font-black text-white mb-6 flex items-center gap-3 border-b border-white/10 pb-4 uppercase tracking-tight">
                                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <Clock className="w-5 h-5 text-emerald-500" />
                                </div>
                                Recent History
                            </h2>

                            <div className="space-y-4 pr-1">
                                {history.length === 0 ? (
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">No broadcasts sent yet.</p>
                                ) : (
                                    history.map(item => (
                                        <div key={item.id} className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all backdrop-blur-sm shadow-sm group break-words">
                                            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border
                                                ${item.priority === 'emergency' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        item.priority === 'warning' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                                    {item.priority}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 font-bold bg-white/5 border border-white/10 px-2 py-1 rounded-lg whitespace-nowrap">
                                                    {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-white text-base mb-2 group-hover:text-[#D4AF37] transition-colors leading-tight">{item.title}</h3>
                                            <p className="text-sm text-zinc-400 leading-relaxed font-medium">{item.message}</p>
                                            <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-wider">
                                                <div className="bg-white/10 p-1.5 rounded-lg text-zinc-400">
                                                    <Users className="w-3 h-3" />
                                                </div>
                                                <span>Sent To: {item.targetGroup}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.main>

            <BottomNav items={adminNavItems} />
        </MobileWrapper>
    );
}
