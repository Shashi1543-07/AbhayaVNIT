import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { Megaphone, Send, Clock, Users } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { adminService } from '../../services/adminService';
import { motion } from 'framer-motion';
import { containerStagger, cardVariant } from '../../lib/animations';

export default function Broadcasts() {
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('');
    const [targetGroup, setTargetGroup] = useState('all');
    const [priority, setPriority] = useState('info');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    const fetchHistory = async () => {
        try {
            const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(10));
            const snapshot = await getDocs(q);
            setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching broadcasts:", error);
        }
    };

    useEffect(() => {
        fetchHistory();
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
            fetchHistory();
        } catch (error) {
            console.error("Error sending broadcast:", error);
            alert('Failed to send broadcast.');
        } finally {
            setSending(false);
        }
    };

    return (
        <Layout role="admin">
            <motion.div
                className="mb-8"
                variants={containerStagger}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={cardVariant}>
                    <h1 className="text-2xl font-bold text-slate-800">Broadcasts & Alerts</h1>
                    <p className="text-slate-600">Send announcements to students, wardens, and security staff.</p>
                </motion.div>
            </motion.div>

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
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
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
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                                    <div key={item.id} className="p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize
                                                ${item.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                                                    item.priority === 'warning' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-blue-100 text-blue-700'}`}>
                                                {item.priority}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h3>
                                        <p className="text-xs text-slate-600 line-clamp-2">{item.message}</p>
                                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
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
        </Layout>
    );
}
