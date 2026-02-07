import React, { useEffect, useState } from 'react';
import { broadcastService, type Broadcast } from '../../services/broadcastService';
import { Megaphone, Send, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';

interface HostelBroadcastsProps {
    hostelId: string;
}

export default function HostelBroadcasts({ hostelId }: HostelBroadcastsProps) {
    const { user } = useAuthStore();
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState<'info' | 'warning' | 'emergency'>('info');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const unsubscribe = broadcastService.subscribeToAllBroadcasts((data: Broadcast[]) => {
            setBroadcasts(data.filter(b => b.hostelId === hostelId));
        });
        return () => unsubscribe();
    }, [hostelId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title || !message) return;

        setIsSending(true);
        try {
            await broadcastService.sendBroadcast({
                title,
                message,
                priority,
                hostelId,
                createdBy: user.displayName || 'Warden',
                createdById: user.uid,
                senderRole: 'warden',
                targetGroup: 'student',
                durationHours: 24
            });
            setTitle('');
            setMessage('');
            setPriority('info');
            alert("Broadcast sent successfully.");
        } catch (error) {
            console.error("Failed to send broadcast:", error);
            alert("Failed to send broadcast.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Send Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-600" />
                    New Announcement
                </h2>

                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g., Water Supply Maintenance"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                        <div className="flex gap-2">
                            {(['info', 'warning', 'emergency'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize border transition-all
                                        ${priority === p
                                            ? p === 'emergency' ? 'bg-red-100 border-red-300 text-red-700'
                                                : p === 'warning' ? 'bg-amber-100 border-amber-300 text-amber-700'
                                                    : 'bg-blue-100 border-blue-300 text-blue-700'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                                    `}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                        <textarea
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSending}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSending ? 'Sending...' : (
                            <>
                                <Send className="w-4 h-4" /> Send to Residents
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Recent Broadcasts */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px] lg:h-full">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="font-bold text-slate-800">Recent Broadcasts</h2>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-4">
                    {broadcasts.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No recent announcements.</p>
                        </div>
                    ) : (
                        broadcasts.map(broadcast => (
                            <div key={broadcast.id} className="border border-slate-100 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        {broadcast.priority === 'emergency' ? <AlertCircle className="w-5 h-5 text-red-600" /> :
                                            broadcast.priority === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                                                <Info className="w-5 h-5 text-blue-500" />}
                                        <h3 className="font-bold text-slate-800">{broadcast.title}</h3>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {broadcast.createdAt?.toDate ? broadcast.createdAt.toDate().toLocaleString() :
                                            broadcast.createdAt?.seconds ? new Date(broadcast.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-sm whitespace-pre-wrap pl-7">
                                    {broadcast.message}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
