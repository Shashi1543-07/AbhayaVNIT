import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
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
        <Layout role="admin">
            <TopHeader title="Broadcasts & Alerts" showBackButton={true} />

            <motion.div
                className="mb-8 pt-16"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >

                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    variants={containerStagger}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Send Form */}
                    <motion.div variants={cardVariant} className="lg:col-span-2 glass-card p-6 rounded-xl shadow-sm border border-white/40">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-indigo-600" />
                            New Announcement
                        </h2>

                        <form onSubmit={handleSend} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                                    <select
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                        value={targetGroup}
                                        onChange={(e) => setTargetGroup(e.target.value)}
                                    >
                                        <option value="all">All Users</option>
                                        <option value="student">Students Only</option>
                                        <option value="warden">Wardens Only</option>
                                        <option value="security">Security Staff Only</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority Level</label>
                                    <select
                                        className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <option value="info">Information (Blue)</option>
                                        <option value="warning">Warning (Orange)</option>
                                        <option value="emergency">Emergency (Red)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Hostel Curfew Update"
                                    required
                                    className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none backdrop-blur-sm"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                <textarea
                                    placeholder="Type your message here..."
                                    required
                                    rows={5}
                                    className="w-full p-3 bg-white/50 border border-white/40 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none backdrop-blur-sm"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send className="w-5 h-5" />
                                {sending ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </form>
                    </motion.div>

                    {/* History Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="glass-card p-6 rounded-xl shadow-sm border border-white/40 h-full">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-slate-500" />
                                Recent History
                            </h2>

                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">No broadcasts sent yet.</p>
                                ) : (
                                    history.map(item => (
                                        <div key={item.id} className="p-4 rounded-xl border border-white/30 bg-white/20 hover:bg-white/30 transition-all backdrop-blur-sm shadow-sm group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize tracking-wide shadow-sm
                                                ${item.priority === 'emergency' ? 'bg-red-500/20 text-red-700 border border-red-200/50' :
                                                        item.priority === 'warning' ? 'bg-orange-500/20 text-orange-700 border border-orange-200/50' :
                                                            'bg-blue-500/20 text-blue-700 border border-blue-200/50'}`}>
                                                    {item.priority}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-medium bg-white/40 px-2 py-0.5 rounded-full">
                                                    {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-700 transition-colors">{item.title}</h3>
                                            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.message}</p>
                                            <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                                                <Users className="w-3 h-3" />
                                                <span className="capitalize">To: {item.targetGroup}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </Layout>
    );
}
