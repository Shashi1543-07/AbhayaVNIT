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
        <Layout role="admin">
            <TopHeader title="Broadcasts & Alerts" showBackButton={true} />

            <motion.main
                className="px-4 pt-28 pb-24"
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
                    <motion.div variants={cardVariant} className="w-full max-w-2xl glass-card p-6 rounded-xl shadow-sm border border-white/40">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 text-indigo-700">
                            <Megaphone className="w-5 h-5" />
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
                                className="w-full bg-gradient-to-r from-[#FF99AC] via-[#C084FC] to-[#89CFF0] text-white py-4 rounded-xl font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Send className="w-5 h-5" />
                                {sending ? 'Sending...' : 'Send Broadcast'}
                            </button>
                        </form>
                    </motion.div>

                    {/* History Sidebar */}
                    <div className="w-full max-w-2xl">
                        <div className="glass-card p-6 rounded-xl shadow-sm border border-white/40 flex flex-col">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 flex-shrink-0 text-slate-600">
                                <Clock className="w-5 h-5" />
                                Recent History
                            </h2>

                            <div className="space-y-4 pr-1">
                                {history.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic py-4 text-center">No broadcasts sent yet.</p>
                                ) : (
                                    history.map(item => (
                                        <div key={item.id} className="p-5 rounded-2xl border border-white/30 bg-white/40 hover:bg-white/50 transition-all backdrop-blur-sm shadow-sm group break-words">
                                            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize tracking-wide shadow-sm
                                                ${item.priority === 'emergency' ? 'bg-red-500/20 text-red-700 border border-red-200/50' :
                                                        item.priority === 'warning' ? 'bg-orange-500/20 text-orange-700 border border-orange-200/50' :
                                                            'bg-blue-500/20 text-blue-700 border border-blue-200/50'}`}>
                                                    {item.priority}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold bg-white/40 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                                                    {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-indigo-700 transition-colors leading-tight">{item.title}</h3>
                                            <p className="text-sm text-slate-600 leading-relaxed opacity-90">{item.message}</p>
                                            <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                <div className="bg-slate-100 p-1 rounded-md">
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
        </Layout>
    );
}
